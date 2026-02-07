import type { Game } from "@/schema/games.schema";
import type { AdminGameResponse, AdminGamesListResponse } from "@/types/games/games.types";
import type { GameWithCreator } from "@/storage/game.storage";
import type { PaginatedResult } from "@/storage/types";
import { transformPaginatedResult } from "./base-dto.helper";

/**
 * Game DTO
 * Transforms raw Game entities to API response shapes
 */
export class GameDTO {
  /**
   * Transform raw Game entity to admin API response
   */
  static toAdminResponse(game: Game): Omit<AdminGameResponse, "createdBy" | "updatedBy"> {
    return {
      id: game.id,
      name: game.name,
      rating: game.rating,
      notes: game.notes,
      played: game.played,
      multiplayerFunctional: game.multiplayerFunctional,
      dropReason: game.dropReason,
      createdById: game.createdById,
      updatedById: game.updatedById,
      createdAt: game.createdAt.toISOString(),
      updatedAt: game.updatedAt.toISOString(),
    };
  }

  /**
   * Transform GameWithCreator to detailed admin response
   */
  static toAdminDetailResponse(game: GameWithCreator): AdminGameResponse {
    return {
      ...this.toAdminResponse(game),
      createdBy: game.createdBy,
      updatedBy: game.updatedBy,
    };
  }

  /**
   * Transform paginated result to admin list response
   */
  static toPaginatedResponse(result: PaginatedResult<GameWithCreator>): AdminGamesListResponse {
    return transformPaginatedResult(result, (game) => this.toAdminDetailResponse(game));
  }
}
