import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { generateUUID } from "@/lib/uuid";
import { cloudStorageService } from "@/services/runtime/cloud-storage";
import { gameService } from "@/services/runtime/game";
import { gameIdParamSchema } from "@/validations/game.validations";

/**
 * POST /api/admin/games/[gameId]/cover
 * Upload a cover image for a game
 */
export const POST = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("games", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { gameId } = gameIdParamSchema.parse(await params);
  const existingGame = await gameService.getById(gameId);

  if (!existingGame) {
    throw new NotFoundError("Game not found");
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    throw new ValidationError("No file provided");
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

  // Generate unique filename
  const imageUuid = generateUUID();

  // Convert file to buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate image dimensions
  const validation = await cloudStorageService.validateImageDimensions(buffer);
  if (!validation.valid) {
    throw new ValidationError(validation.error);
  }

  // Upload to Google Cloud Storage
  const uploadResult = await cloudStorageService.uploadImage(
    buffer,
    imageUuid,
    "images/games/covers",
  );

  // Update game with cover image URL
  await gameService.update(gameId, {
    coverImage: uploadResult.url,
    updatedById: session.user.id,
  });

  return NextResponse.json({
    url: uploadResult.url,
    fileName: uploadResult.fileName,
    originalName: uploadResult.originalName,
  });
});

/**
 * DELETE /api/admin/games/[gameId]/cover
 * Remove cover image from a game
 */
export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("games", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { gameId } = gameIdParamSchema.parse(await params);
  const existingGame = await gameService.getById(gameId);

  if (!existingGame) {
    throw new NotFoundError("Game not found");
  }

  // Update game to remove cover image URL
  await gameService.update(gameId, {
    coverImage: null,
    updatedById: session.user.id,
  });

  return NextResponse.json({ success: true });
});

interface RouteParams {
  params: Promise<{ gameId: string }>;
}
