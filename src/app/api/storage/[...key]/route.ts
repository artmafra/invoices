import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { cloudStorageService } from "@/services/runtime/cloud-storage";

export const runtime = "nodejs";

function normalizeObjectKey(rawSegments: string[] | undefined): string {
  let segments: string[];
  try {
    segments = (rawSegments ?? []).map((segment) => decodeURIComponent(segment));
  } catch {
    throw new ValidationError("Invalid image key");
  }

  if (segments.length === 0) {
    throw new ValidationError("No image key provided");
  }

  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") {
      throw new ValidationError("Invalid image key");
    }

    if (segment.includes("/") || segment.includes("\\")) {
      throw new ValidationError("Invalid image key");
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(segment)) {
      throw new ValidationError("Invalid image key");
    }
  }

  const objectKey = segments.join("/");

  // Hard allowlist: only serve images under the images/ prefix.
  if (!objectKey.startsWith("images/")) {
    throw new ValidationError("Invalid image key");
  }

  return objectKey;
}

export const GET = withErrorHandler(
  async (request: NextRequest, context: { params: Promise<{ key?: string[] | string }> }) => {
    const params = await context.params;
    const rawKey = params?.key;
    const rawSegments = Array.isArray(rawKey)
      ? rawKey
      : typeof rawKey === "string"
        ? [rawKey]
        : undefined;
    const objectKey = normalizeObjectKey(rawSegments);

    const file = cloudStorageService.getGcsFile(objectKey);

    let metadata:
      | {
          contentType?: string;
          cacheControl?: string;
          etag?: string;
          size?: string | number;
        }
      | undefined;

    try {
      const result = await file.getMetadata();
      metadata = result[0] as any;
    } catch {
      throw new NotFoundError("Image");
    }

    const contentType = metadata?.contentType;

    // Only serve raster images; reject SVG explicitly.
    if (!contentType || !contentType.startsWith("image/") || contentType === "image/svg+xml") {
      throw new NotFoundError("Image");
    }

    const etag = metadata?.etag;
    const ifNoneMatch = request.headers.get("if-none-match");

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("X-Content-Type-Options", "nosniff");

    // Use object cacheControl if present; avatars already get shorter cacheControl.
    if (metadata?.cacheControl) {
      headers.set("Cache-Control", metadata.cacheControl);
    } else if (objectKey.startsWith("images/profile-pictures/")) {
      headers.set("Cache-Control", "public, max-age=604800, must-revalidate");
    } else {
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
    }

    if (etag) {
      headers.set("ETag", etag);
      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, { status: 304, headers });
      }
    }

    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, { status: 200, headers });
  },
);
