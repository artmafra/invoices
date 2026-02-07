/**
 * Generic Pagination Helper for Drizzle ORM Queries
 *
 * Eliminates pagination logic duplication across storage classes.
 * Handles offset calculation, total pages calculation, and dual query execution (count + data).
 */

import type { PaginatedResult, PaginationOptions } from "@/storage/types";

/**
 * Configuration for paginate function
 */
export interface PaginateConfig {
  /**
   * Base query for fetching data (should include WHERE, JOINs, ORDER BY)
   * Will have limit() and offset() applied automatically
   */
  dataQuery: any; // Drizzle query builder type inference

  /**
   * Optional separate count query
   * Use when count logic differs from data query (e.g., counting with joins)
   * If omitted, will attempt to count from dataQuery's table
   */
  countQuery?: any; // Drizzle query builder for count

  /**
   * Pagination options (page, limit)
   */
  options?: PaginationOptions;

  /**
   * Default limit per page if not specified in options
   * @default 20
   */
  defaultLimit?: number;
}

/**
 * Apply pagination (limit + offset) to a Drizzle query builder
 *
 * @example
 * let query = db.select().from(usersTable).where(eq(usersTable.isActive, true));
 * query = applyPagination(query, { page: 2, limit: 50 });
 * const data = await query;
 */
export function applyPagination<TQuery>(
  query: TQuery,
  options?: PaginationOptions,
  defaultLimit = 20,
): TQuery {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? defaultLimit;
  const offset = (page - 1) * limit;

  return (query as any).limit(limit).offset(offset) as TQuery;
}

/**
 * Execute paginated query with count
 *
 * Handles:
 * - Offset calculation: (page - 1) * limit
 * - Total pages calculation: Math.ceil(total / limit)
 * - Dual query execution (count + data)
 *
 * Caller is responsible for:
 * - Building base query with WHERE, JOINs, ORDER BY
 * - Providing optional countQuery if count logic differs from data query
 *
 * @example
 * // Simple pagination
 * const dataQuery = db.select().from(tagsTable).orderBy(tagsTable.name);
 * const countQuery = db.select({ count: count() }).from(tagsTable);
 * return paginate({ dataQuery, countQuery, options });
 *
 * @example
 * // With filters
 * let dataQuery = db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
 * let countQuery = db.select({ count: count() }).from(usersTable);
 * if (whereClause) {
 *   dataQuery = dataQuery.where(whereClause) as typeof dataQuery;
 *   countQuery = countQuery.where(whereClause) as typeof countQuery;
 * }
 * return paginate({ dataQuery, countQuery, options, defaultLimit: 50 });
 */
export async function paginate<TData = any>(
  config: PaginateConfig,
): Promise<PaginatedResult<TData>> {
  const page = config.options?.page ?? 1;
  const limit = config.options?.limit ?? config.defaultLimit ?? 20;
  const offset = (page - 1) * limit;

  // Execute count query
  if (!config.countQuery) {
    throw new Error(
      "paginate: countQuery is required. Build a separate count query using db.select({ count: count() }).from(table)",
    );
  }

  const countResult: any = await config.countQuery;
  const total = countResult[0]?.count ?? 0;

  // Apply pagination to data query and execute
  const data = (await (config.dataQuery as any).limit(limit).offset(offset)) as TData[];

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
