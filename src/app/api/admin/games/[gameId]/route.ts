import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { gameService } from "@/services/runtime/game";
import { gameIdParamSchema, updateGameSchema } from "@/validations/game.validations";

interface RouteParams {
  params: Promise<{ gameId: string }>;
}

/**
 * GET /api/admin/games/[gameId]
 * Get a single game by ID
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("games", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { gameId } = gameIdParamSchema.parse(await params);
  const game = await gameService.getByIdWithCreator(gameId);

  if (!game) {
    throw new NotFoundError("Game not found");
  }

  return NextResponse.json(game);
});

/**
 * PATCH /api/admin/games/[gameId]
 * Update a game
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
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

  const body = await request.json();
  const validation = updateGameSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  // Check for duplicate name if name is being changed
  if (validation.data.name && validation.data.name !== existingGame.name) {
    const isNameAvailable = await gameService.isNameAvailable(validation.data.name, gameId);
    if (!isNameAvailable) {
      throw new ConflictError("A game with this name already exists");
    }
  }

  const game = await gameService.update(gameId, {
    ...validation.data,
    updatedById: session.user.id,
  });

  // Build changes array for fields that changed
  const changes = [];
  if (validation.data.name !== undefined && existingGame.name !== game.name) {
    changes.push({ field: "name", from: existingGame.name, to: game.name });
  }
  if (validation.data.rating !== undefined && existingGame.rating !== game.rating) {
    changes.push({ field: "rating", from: existingGame.rating, to: game.rating });
  }
  if (validation.data.played !== undefined && existingGame.played !== game.played) {
    changes.push({ field: "played", from: existingGame.played, to: game.played });
  }
  if (
    validation.data.multiplayerFunctional !== undefined &&
    existingGame.multiplayerFunctional !== game.multiplayerFunctional
  ) {
    changes.push({
      field: "multiplayerFunctional",
      from: existingGame.multiplayerFunctional,
      to: game.multiplayerFunctional,
    });
  }
  if (validation.data.dropReason !== undefined && existingGame.dropReason !== game.dropReason) {
    changes.push({ field: "dropReason", from: existingGame.dropReason, to: game.dropReason });
  }

  // Only log if there are actual changes
  if (changes.length > 0) {
    await activityService.logUpdate(
      session,
      "games",
      { type: "game", id: game.id, name: game.name },
      changes,
    );
  }

  return NextResponse.json(game);
});

/**
 * DELETE /api/admin/games/[gameId]
 * Delete a game
 */
export const DELETE = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("games", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { gameId } = gameIdParamSchema.parse(await params);
  const existingGame = await gameService.getById(gameId);

  if (!existingGame) {
    throw new NotFoundError("Game not found");
  }

  await gameService.delete(gameId);

  await activityService.logDelete(session, "games", {
    type: "game",
    id: existingGame.id,
    name: existingGame.name,
  });

  return NextResponse.json({ success: true });
});
