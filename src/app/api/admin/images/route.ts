import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ForbiddenError,
  InternalServerError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { cloudStorageService } from "@/services/runtime/cloud-storage";

export const GET = withErrorHandler(async () => {
  const { authorized, error, status } = await requirePermission("settings", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const images = await cloudStorageService.listImages();

  return NextResponse.json({
    success: true,
    images,
  });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("settings", "edit");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const formData = await request.formData();
  const action = formData.get("action") as string;

  if (action === "upload") {
    const file = formData.get("file") as File;
    const customFilename = formData.get("filename") as string;

    if (!file) {
      throw new ValidationError("No file provided");
    }

    if (!customFilename || !customFilename.trim()) {
      throw new ValidationError("No filename provided");
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new ValidationError("Only image files are allowed");
    }

    if (file.type === "image/svg+xml") {
      throw new ValidationError("SVG images are not allowed");
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new ValidationError("File size must be less than 5MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await cloudStorageService.uploadImage(buffer, customFilename.trim());

    return NextResponse.json({
      success: true,
      message: "Image uploaded successfully",
      image: {
        name: result.fileName,
        url: result.url,
        size: file.size,
        updated: new Date().toISOString(),
        contentType: result.contentType ?? file.type,
      },
    });
  } else if (action === "delete") {
    const imageUrl = formData.get("imageUrl") as string;

    if (!imageUrl) {
      throw new ValidationError("No image URL provided");
    }

    const success = await cloudStorageService.deleteImageByUrl(imageUrl);

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Image deleted successfully",
      });
    } else {
      throw new InternalServerError("Failed to delete image");
    }
  } else {
    throw new ValidationError("Invalid action");
  }
});
