/**
 * Base DTO Helper
 * Shared utilities for DTO transformations across the application
 */

/**
 * Serialize a Date object to ISO string, or return null if undefined
 */
export function serializeDate(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Serialize dates in an object (mutates the object)
 * Useful for bulk date serialization
 */
export function serializeDates<T extends Record<string, unknown>>(
  obj: T,
  dateFields: (keyof T)[],
): T {
  const result = { ...obj };
  for (const field of dateFields) {
    const value = result[field];
    if (value instanceof Date) {
      (result[field] as unknown) = value.toISOString();
    } else if (value === null || value === undefined) {
      (result[field] as unknown) = null;
    }
  }
  return result;
}

/**
 * Pick specific fields from an object
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  fields: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const field of fields) {
    result[field] = obj[field];
  }
  return result;
}

/**
 * Omit specific fields from an object
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  fields: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}

/**
 * Transform a paginated result using a mapper function
 */
export function transformPaginatedResult<TInput, TOutput>(
  result: {
    data: TInput[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  },
  mapper: (item: TInput) => TOutput,
): {
  data: TOutput[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} {
  return {
    data: result.data.map(mapper),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  };
}
