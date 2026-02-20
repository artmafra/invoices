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
<<<<<<< HEAD
    throw new ValidationError("Invalid image key");
  }

  if (segments.length === 0) {
    throw new ValidationError("No image key provided");
=======
    throw new ValidationError("Invalid image key", "INVALID_IMAGE_KEY");
  }

  if (segments.length === 0) {
    throw new ValidationError("No image key provided", "NO_IMAGE_KEY");
>>>>>>> relax
  }

  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") {
<<<<<<< HEAD
      throw new ValidationError("Invalid image key");
    }

    if (segment.includes("/") || segment.includes("\\")) {
      throw new ValidationError("Invalid image key");
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(segment)) {
      throw new ValidationError("Invalid image key");
=======
      throw new ValidationError("Path traversal attempt detected", "PATH_TRAVERSAL_ATTEMPT");
    }

    if (segment.includes("/") || segment.includes("\\")) {
      throw new ValidationError("Invalid path separator in segment", "INVALID_PATH_SEPARATOR");
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(segment)) {
      throw new ValidationError("Invalid characters in path segment", "INVALID_PATH_CHARACTERS");
>>>>>>> relax
    }
  }

  const objectKey = segments.join("/");

  // Hard allowlist: only serve images under the images/ prefix.
  if (!objectKey.startsWith("images/")) {
<<<<<<< HEAD
    throw new ValidationError("Invalid image key");
=======
    throw new ValidationError("Access to this path is not allowed", "PATH_NOT_ALLOWED");
>>>>>>> relax
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
<<<<<<< HEAD
      throw new NotFoundError("Image");
=======
      throw new NotFoundError("Image", "IMAGE_NOT_FOUND");
>>>>>>> relax
    }

    const contentType = metadata?.contentType;

    // Only serve raster images; reject SVG explicitly.
    if (!contentType || !contentType.startsWith("image/") || contentType === "image/svg+xml") {
<<<<<<< HEAD
      throw new NotFoundError("Image");
=======
      throw new NotFoundError("Image", "IMAGE_NOT_FOUND");
>>>>>>> relax
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
