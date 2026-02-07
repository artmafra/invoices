import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { InternalServerError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { activityService } from "@/services/runtime/activity";
import { cloudStorageService } from "@/services/runtime/cloud-storage";
import { userService } from "@/services/runtime/user";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const formData = await request.formData();
  const image = formData.get("image") as File;

  if (!image) {
    throw new ValidationError("No image file provided", "NO_IMAGE_PROVIDED");
  }

  // Validate file type
  if (!image.type.startsWith("image/")) {
    throw new ValidationError("File must be an image", "NOT_AN_IMAGE");
  }

  if (image.type === "image/svg+xml") {
    throw new ValidationError("SVG images are not allowed", "SVG_NOT_ALLOWED");
  }

  // Validate file size (10MB max for original, we'll compress it down)
  if (image.size > 10 * 1024 * 1024) {
    throw new ValidationError("Image must be smaller than 10MB", "IMAGE_TOO_LARGE");
  }

  // Validate image format (allow more formats since we'll convert to WebP)
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(image.type)) {
    throw new ValidationError("Unsupported image format", "UNSUPPORTED_IMAGE_FORMAT");
  }

  // Convert file to buffer
  const bytes = await image.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Validate image dimensions before processing (prevents decompression bombs)
  const validation = await cloudStorageService.validateImageDimensions(buffer);
  if (!validation.valid) {
    throw new ValidationError(
      validation.error || "Invalid image dimensions",
      "INVALID_IMAGE_DIMENSIONS",
    );
  }

  // Upload to Google Cloud Storage with compression and resizing
  const uploadResult = await cloudStorageService.uploadProfilePicture(
    buffer,
    session.user.id,
    image.name,
    {
      width: 300, // Standard profile picture size
      height: 300, // Square format
      quality: 85, // Good quality with compression
      format: "webp", // Modern format for best compression
    },
  );

  // Update user's image URL in database
  const updatedUser = await userService.updateUser(session.user.id, {
    image: uploadResult.url,
  });

  if (!updatedUser) {
    throw new InternalServerError("Failed to update profile picture");
  }

  // Log activity
  await activityService.logAction(
    session,
    "upload_avatar",
    "users",
    {
      type: "user",
      id: session.user.id,
      name: session.user.name || session.user.email || undefined,
    },
    {
      metadata: {
        imageUrl: uploadResult.url,
      },
    },
  );

  return NextResponse.json({
    message: "Profile picture updated successfully",
    imageUrl: uploadResult.url,
    metadata: {
      format: "webp",
      dimensions: "300x300",
      compressed: true,
    },
  });
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Delete profile picture from Google Cloud Storage
  await cloudStorageService.deleteExistingProfilePicture(session.user.id);

  // Remove image URL from database
  const updatedUser = await userService.updateUser(session.user.id, {
    image: null,
  });

  if (!updatedUser) {
    throw new InternalServerError("Failed to remove profile picture");
  }

  // Log activity
  await activityService.logAction(session, "delete_avatar", "users", {
    type: "user",
    id: session.user.id,
    name: session.user.name || session.user.email || undefined,
  });

  return NextResponse.json({
    message: "Profile picture removed successfully",
  });
});
