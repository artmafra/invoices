import { gamesTable, type Game, type GameNew } from "@/schema/games.schema";
import { usersTable } from "@/schema/users.schema";
import { and, asc, count, desc, eq, gte, ilike, isNotNull, max, or, type SQL } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";

/**
 * Filter options for games queries
 */
export interface GameFilterOptions {
  search?: string;
  played?: boolean | "dropped"; // true = played, false = not played, "dropped" = has drop reason
  minRating?: number;
  multiplayerFunctional?: boolean;
}

/**
 * Game with creator information
 */
export interface GameWithCreator extends Game {
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  updatedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export class GameStorage implements BaseStorage<Game, GameNew, Partial<GameNew>> {
  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: GameFilterOptions) {
    const conditions = [];

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(or(ilike(gamesTable.name, searchTerm), ilike(gamesTable.notes, searchTerm)));
    }

    if (filters.played === true) {
      conditions.push(eq(gamesTable.played, true));
    } else if (filters.played === false) {
      conditions.push(eq(gamesTable.played, false));
    } else if (filters.played === "dropped") {
      conditions.push(isNotNull(gamesTable.dropReason));
    }

    if (filters.minRating !== undefined && filters.minRating > 0) {
      conditions.push(gte(gamesTable.rating, filters.minRating));
    }

    if (filters.multiplayerFunctional !== undefined) {
      conditions.push(eq(gamesTable.multiplayerFunctional, filters.multiplayerFunctional));
    }

    return conditions;
  }

  /**
   * Get collection version for ETag generation.
   * Returns max(updated_at) and count for the filtered set.
   *
   * Uses Redis caching with 10-second TTL to reduce database load.
   */
  async getCollectionVersion(
    filters: GameFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("games", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(gamesTable.updatedAt),
          count: count(gamesTable.id),
        })
        .from(gamesTable);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  /**
   * Find game by ID
   */
  async findById(id: string): Promise<Game | undefined> {
    const result = await db.select().from(gamesTable).where(eq(gamesTable.id, id)).limit(1);

    return result[0];
  }

  /**
   * Find game by ID with creator info
   */
  async findByIdWithCreator(id: string): Promise<GameWithCreator | undefined> {
    const createdByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("createdByUser");

    const updatedByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("updatedByUser");

    const result = await db
      .select({
        game: gamesTable,
        createdBy: {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        },
        updatedBy: {
          id: updatedByUser.id,
          name: updatedByUser.name,
          email: updatedByUser.email,
        },
      })
      .from(gamesTable)
      .leftJoin(createdByUser, eq(gamesTable.createdById, createdByUser.id))
      .leftJoin(updatedByUser, eq(gamesTable.updatedById, updatedByUser.id))
      .where(eq(gamesTable.id, id))
      .limit(1);

    if (!result[0]) return undefined;

    const { game, createdBy, updatedBy } = result[0];
    return {
      ...game,
      createdBy: createdBy?.id ? createdBy : null,
      updatedBy: updatedBy?.id ? updatedBy : null,
    };
  }

  /**
   * Find game by name (for uniqueness check)
   */
  async findByName(name: string): Promise<Game | undefined> {
    const result = await db.select().from(gamesTable).where(ilike(gamesTable.name, name)).limit(1);

    return result[0];
  }

  /**
   * Find many games with optional filters
   */
  async findMany(filters: GameFilterOptions = {}): Promise<Game[]> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db.select().from(gamesTable).orderBy(desc(gamesTable.createdAt));

    return whereClause ? query.where(whereClause) : query;
  }

  /**
   * Build ORDER BY clause based on sort options
   */
  private buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc"): SQL {
    const order = sortOrder === "asc" ? asc : desc;

    switch (sortBy) {
      case "name":
        return order(gamesTable.name);
      case "rating":
        return order(gamesTable.rating);
      case "updatedAt":
        return order(gamesTable.updatedAt);
      case "createdAt":
      default:
        return order(gamesTable.createdAt);
    }
  }

  /**
   * Find games with pagination (default sort: newest first)
   */
  async findManyPaginated(
    filters: GameFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<GameWithCreator>> {
    const { sortBy, sortOrder } = options;
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build creator subqueries
    const createdByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("createdByUser");

    const updatedByUser = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .as("updatedByUser");

    // Build queries
    let countQuery = db.select({ count: count(gamesTable.id) }).from(gamesTable);
    let dataQuery = db
      .select({
        game: gamesTable,
        createdBy: {
          id: createdByUser.id,
          name: createdByUser.name,
          email: createdByUser.email,
        },
        updatedBy: {
          id: updatedByUser.id,
          name: updatedByUser.name,
          email: updatedByUser.email,
        },
      })
      .from(gamesTable)
      .leftJoin(createdByUser, eq(gamesTable.createdById, createdByUser.id))
      .leftJoin(updatedByUser, eq(gamesTable.updatedById, updatedByUser.id))
      .orderBy(orderBy);

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    // Use pagination helper
    const result = await paginate({
      dataQuery,
      countQuery,
      options,
    });

    // Map results to GameWithCreator structure
    const data: GameWithCreator[] = result.data.map(({ game, createdBy, updatedBy }) => ({
      ...game,
      createdBy: createdBy?.id ? createdBy : null,
      updatedBy: updatedBy?.id ? updatedBy : null,
    }));

    return {
      ...result,
      data,
    };
  }

  /**
   * Create a new game
   */
  async create(data: GameNew): Promise<Game> {
    const [result] = await db.insert(gamesTable).values(data).returning();

    // Invalidate version cache
    await versionCache.invalidate("games");

    return result;
  }

  /**
   * Update a game
   */
  async update(id: string, data: Partial<GameNew>): Promise<Game> {
    const [result] = await db
      .update(gamesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(gamesTable.id, id))
      .returning();

    // Invalidate version cache
    await versionCache.invalidate("games");

    return result;
  }

  /**
   * Delete a game
   */
  async delete(id: string): Promise<boolean> {
    const result = await db.delete(gamesTable).where(eq(gamesTable.id, id)).returning();
    const deleted = result.length > 0;

    if (deleted) {
      // Invalidate version cache
      await versionCache.invalidate("games");
    }

    return deleted;
  }
}
