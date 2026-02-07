import {
  loginHistoryTable,
  type AuthMethod,
  type LoginHistory,
  type LoginHistoryNew,
} from "@/schema/login-history.schema";
import { and, asc, count, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { db } from "@/db/postgres";
import { paginate } from "@/storage/helpers/pagination";
import type { PaginatedResult, PaginationOptions } from "@/storage/types";

/**
 * Filter options for login history queries
 */
export interface LoginHistoryFilterOptions {
  userId?: string;
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  authMethod?: AuthMethod;
  search?: string;
}

export class LoginHistoryStorage {
  /**
   * Build WHERE conditions based on filters
   */
  private buildWhereConditions(filters: LoginHistoryFilterOptions) {
    const conditions = [];

    if (filters.userId) {
      conditions.push(eq(loginHistoryTable.userId, filters.userId));
    }

    if (filters.success !== undefined) {
      conditions.push(eq(loginHistoryTable.success, filters.success));
    }

    if (filters.startDate) {
      conditions.push(gte(loginHistoryTable.createdAt, filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(lte(loginHistoryTable.createdAt, filters.endDate));
    }

    if (filters.authMethod) {
      conditions.push(eq(loginHistoryTable.authMethod, filters.authMethod));
    }

    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(loginHistoryTable.browser, searchTerm),
          ilike(loginHistoryTable.os, searchTerm),
          ilike(loginHistoryTable.city, searchTerm),
          ilike(loginHistoryTable.country, searchTerm),
          ilike(loginHistoryTable.ipAddress, searchTerm),
        )!,
      );
    }

    return conditions;
  }

  /**
   * Create a new login history entry
   */
  async create(data: LoginHistoryNew): Promise<LoginHistory> {
    const [created] = await db.insert(loginHistoryTable).values(data).returning();
    return created;
  }

  /**
   * Find login history entry by ID
   */
  async findById(id: string): Promise<LoginHistory | undefined> {
    const result = await db
      .select()
      .from(loginHistoryTable)
      .where(eq(loginHistoryTable.id, id))
      .limit(1);

    return result[0];
  }

  /**
   * Find login history entries with optional filtering
   */
  async findMany(filters: LoginHistoryFilterOptions = {}): Promise<LoginHistory[]> {
    const conditions = this.buildWhereConditions(filters);

    let query = db.select().from(loginHistoryTable);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    return query.orderBy(desc(loginHistoryTable.createdAt));
  }

  /**
   * Find login history with pagination
   */
  async findManyPaginated(
    filters: LoginHistoryFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<LoginHistory>> {
    const sortOrder = options.sortOrder || "desc";

    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Build queries
    let countQuery = db.select({ count: count() }).from(loginHistoryTable);
    let dataQuery = db.select().from(loginHistoryTable);

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
    }

    // Apply sorting
    if (sortOrder === "asc") {
      dataQuery = dataQuery.orderBy(asc(loginHistoryTable.createdAt)) as typeof dataQuery;
    } else {
      dataQuery = dataQuery.orderBy(desc(loginHistoryTable.createdAt)) as typeof dataQuery;
    }

    return paginate<LoginHistory>({
      dataQuery,
      countQuery,
      options,
    });
  }

  /**
   * Find recent login history for a user
   */
  async findRecent(userId: string, limit: number = 5): Promise<LoginHistory[]> {
    return db
      .select()
      .from(loginHistoryTable)
      .where(eq(loginHistoryTable.userId, userId))
      .orderBy(desc(loginHistoryTable.createdAt))
      .limit(limit);
  }

  /**
   * Delete login history entries older than specified days
   * Used by cleanup cron job for 90-day retention
   */
  async deleteOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(loginHistoryTable)
      .where(lte(loginHistoryTable.createdAt, cutoffDate))
      .returning({ id: loginHistoryTable.id });

    return result.length;
  }

  /**
   * Count login attempts for a user within a time period
   * Useful for security analysis
   */
  async countAttempts(
    userId: string,
    options: { success?: boolean; since?: Date } = {},
  ): Promise<number> {
    const conditions = [eq(loginHistoryTable.userId, userId)];

    if (options.success !== undefined) {
      conditions.push(eq(loginHistoryTable.success, options.success));
    }

    if (options.since) {
      conditions.push(gte(loginHistoryTable.createdAt, options.since));
    }

    const [{ count: total }] = await db
      .select({ count: count() })
      .from(loginHistoryTable)
      .where(and(...conditions));

    return total;
  }
}
