import { z } from "zod";

/**
 * Shared query validation schemas for consistent API pagination and filtering
 * across all admin endpoints.
 *
 * Usage:
 * - Import basePaginationSchema to get page/limit with safe defaults
 * - Import baseSortSchema for sortBy/sortOrder validation
 * - Extend with resource-specific filters using .extend()
 *
 * Example:
 * ```ts
 * const myQuerySchema = basePaginationSchema
 *   .extend(baseSortSchema.shape)
 *   .extend({
 *     search: z.string().optional(),
 *     status: z.enum(["active", "inactive"]).optional(),
 *   });
 * ```
 */

// ========================================
// Pagination Schema
// ========================================

/**
 * Base pagination schema with safe defaults and bounds.
 * - page: defaults to 1, minimum 1
 * - limit: defaults to 20, minimum 1, maximum 100
 *
 * Coerces strings to numbers and validates they're positive integers.
 */
export const basePaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20).optional(),
});

export type PaginationQuery = z.infer<typeof basePaginationSchema>;

// ========================================
// Sort Schema
// ========================================

/**
 * Base sort schema for ordering results.
 * - sortBy: field name to sort by (no default, resource-specific)
 * - sortOrder: "asc" or "desc", defaults to "desc"
 */
export const baseSortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc").optional(),
});

export type SortQuery = z.infer<typeof baseSortSchema>;

// ========================================
// Search Schema
// ========================================

/**
 * Base search schema for text filtering.
 * - search: optional string query
 */
export const baseSearchSchema = z.object({
  search: z.string().optional(),
});

export type SearchQuery = z.infer<typeof baseSearchSchema>;

// ========================================
// Combined Query Schema
// ========================================

/**
 * Combined base query schema with pagination, sorting, and search.
 * Use this as a starting point for most list endpoints.
 */
export const baseQuerySchema = basePaginationSchema
  .extend(baseSortSchema.shape)
  .extend(baseSearchSchema.shape);

export type BaseQuery = z.infer<typeof baseQuerySchema>;

// ========================================
// Helper Functions
// ========================================

/**
 * Parse and validate query parameters from a NextRequest.
 * Returns validated data with defaults applied, or throws ValidationError.
 *
 * @param searchParams - URLSearchParams from request.nextUrl.searchParams
 * @param schema - Zod schema to validate against
 * @returns Validated and type-safe query parameters
 *
 * @example
 * const query = parseQuery(request.nextUrl.searchParams, myQuerySchema);
 */
export function parseQuery<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T,
): z.infer<T> {
  // Convert URLSearchParams to plain object
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Parse and validate
  const result = schema.safeParse(params);

  if (!result.success) {
    // Convert Zod errors to a user-friendly format
    const errors = result.error.issues.map((err) => `${err.path.join(".")}: ${err.message}`);
    throw new Error(`Invalid query parameters: ${errors.join(", ")}`);
  }

  return result.data;
}

/**
 * Extract pagination options from validated query.
 */
export function extractPaginationOptions(query: PaginationQuery) {
  return {
    page: query.page,
    limit: query.limit,
  };
}

/**
 * Extract sort options from validated query, with fallback defaults.
 */
export function extractSortOptions(
  query: SortQuery,
  defaultSortBy: string = "createdAt",
): {
  sortBy: string;
  sortOrder: "asc" | "desc";
} {
  return {
    sortBy: query.sortBy ?? defaultSortBy,
    sortOrder: query.sortOrder ?? "desc",
  };
}
