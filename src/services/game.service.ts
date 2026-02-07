import { GameDTO } from "@/dtos/game.dto";
import type { Game, GameNew } from "@/schema/games.schema";
import type { AdminGameResponse, AdminGamesListResponse } from "@/types/games/games.types";
import { type GameFilterOptions } from "@/storage/game.storage";
import { gameStorage } from "@/storage/runtime/game";
import type { PaginationOptions } from "@/storage/types";

/**
 * Game Service
 * Business logic for managing coop games
 */
export class GameService {
  /**
   * Get game by ID
   */
  async getById(id: string): Promise<Game | null> {
    return (await gameStorage.findById(id)) ?? null;
  }

  /**
   * Get game by ID with creator info (returns DTO for API)
   */
  async getByIdWithCreator(id: string): Promise<AdminGameResponse | null> {
    const game = await gameStorage.findByIdWithCreator(id);
    return game ? GameDTO.toAdminDetailResponse(game) : null;
  }

  /**
   * Get game by name (for uniqueness check)
   */
  async getByName(name: string): Promise<Game | null> {
    return (await gameStorage.findByName(name)) ?? null;
  }

  /**
   * Get all games
   */
  async getAll(filters?: GameFilterOptions): Promise<Game[]> {
    return gameStorage.findMany(filters);
  }

  /**
   * Get games with pagination (returns DTO for API)
   */
  async getPaginated(
    filters?: GameFilterOptions,
    options?: PaginationOptions,
  ): Promise<AdminGamesListResponse> {
    const result = await gameStorage.findManyPaginated(filters, options);
    return GameDTO.toPaginatedResponse(result);
  }

  /**
   * Get collection version for ETag generation.
   */
  async getCollectionVersion(filters?: GameFilterOptions) {
    return gameStorage.getCollectionVersion(filters);
  }

  /**
   * Create a new game (returns DTO for API)
   */
  async create(data: {
    name: string;
    coverImage?: string | null;
    xboxStoreLink?: string | null;
    rating?: number;
    multiplayerFunctional?: boolean;
    tried?: boolean;
    played?: boolean;
    dropReason?: string | null;
    notes?: string | null;
    createdById: string;
  }): Promise<AdminGameResponse> {
    const game = await gameStorage.create({
      name: data.name,
      coverImage: data.coverImage ?? null,
      xboxStoreLink: data.xboxStoreLink ?? null,
      rating: data.rating ?? 0,
      multiplayerFunctional: data.multiplayerFunctional ?? false,
      tried: data.tried ?? false,
      played: data.played ?? false,
      dropReason: data.dropReason ?? null,
      notes: data.notes ?? null,
      createdById: data.createdById,
      updatedById: data.createdById,
    });

    // Fetch with relations for complete response
    const gameWithCreator = await gameStorage.findByIdWithCreator(game.id);
    return gameWithCreator
      ? GameDTO.toAdminDetailResponse(gameWithCreator)
      : GameDTO.toAdminDetailResponse({ ...game, createdBy: null, updatedBy: null });
  }

  /**
   * Update a game (returns DTO for API)
   */
  async update(
    id: string,
    data: {
      name?: string;
      coverImage?: string | null;
      xboxStoreLink?: string | null;
      rating?: number;
      multiplayerFunctional?: boolean;
      tried?: boolean;
      played?: boolean;
      dropReason?: string | null;
      notes?: string | null;
      updatedById: string;
    },
  ): Promise<AdminGameResponse> {
    const updateData: Partial<GameNew> = {
      updatedById: data.updatedById,
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.xboxStoreLink !== undefined) updateData.xboxStoreLink = data.xboxStoreLink;
    if (data.rating !== undefined) updateData.rating = data.rating;
    if (data.multiplayerFunctional !== undefined)
      updateData.multiplayerFunctional = data.multiplayerFunctional;
    if (data.tried !== undefined) updateData.tried = data.tried;
    if (data.played !== undefined) updateData.played = data.played;
    if (data.dropReason !== undefined) updateData.dropReason = data.dropReason;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await gameStorage.update(id, updateData);

    // Fetch with relations for complete response
    const gameWithCreator = await gameStorage.findByIdWithCreator(id);
    if (!gameWithCreator) {
      throw new Error(`Game ${id} not found after update`);
    }
    return GameDTO.toAdminDetailResponse(gameWithCreator);
  }

  /**
   * Delete a game
   */
  async delete(id: string): Promise<boolean> {
    return gameStorage.delete(id);
  }

  /**
   * Check if a game name is available (for uniqueness validation)
   */
  async isNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    const existing = await gameStorage.findByName(name);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }
}
