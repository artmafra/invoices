import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ConflictError,
  ForbiddenError,
  fromZodError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { gameService } from "@/services/runtime/game";
import { createGameSchema, getGamesQuerySchema } from "@/validations/game.validations";

/**
 * GET /api/admin/games
 * List all games with pagination and filters
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("games", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Parse and validate query parameters with shared schema
  const queryResult = getGamesQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const query = queryResult.data;

  const filters = {
    search: query.search,
    played: query.played,
    minRating: query.minRating,
    multiplayerFunctional: query.multiplayerFunctional,
  };

  const options = {
    page: query.page,
    limit: query.limit,
    sortBy: query.sortBy ?? "createdAt",
    sortOrder: query.sortOrder,
  };

  const queryParamsSeed = buildQueryParamsSeed({
    ...filters,
    page: query.page,
    limit: query.limit,
    sortBy: options.sortBy,
    sortOrder: query.sortOrder,
  });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await gameService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      return gameService.getPaginated(filters, options);
    },
  );
});

/**
 * POST /api/admin/games
 * Create a new game
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("games", "create");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = createGameSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  // Check for duplicate name
  const isNameAvailable = await gameService.isNameAvailable(validation.data.name);
  if (!isNameAvailable) {
    throw new ConflictError("A game with this name already exists");
  }

  const game = await gameService.create({
    ...validation.data,
    createdById: session.user.id,
  });

  await activityService.logCreate(
    session,
    "games",
    { type: "game", id: game.id, name: game.name },
    {
      metadata: {
        name: game.name,
        rating: game.rating,
        played: game.played,
        multiplayerFunctional: game.multiplayerFunctional,
      },
    },
  );

  return NextResponse.json(game, { status: 201 });
});
