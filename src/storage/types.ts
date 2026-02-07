/**
 * Base repository interface that all repositories should implement
 */
export interface BaseStorage<T, TInsert = Partial<T>, TUpdate = Partial<T>> {
  findById(id: string): Promise<T | undefined>;
  findMany(filters?: Record<string, any>): Promise<T[]>;
  create(data: TInsert): Promise<T>;
  update(id: string, data: TUpdate): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Filter options for queries
 */
export interface FilterOptions {
  search?: string;
  isActive?: boolean;
  category?: string;
  excludeSystemUsers?: boolean;
  [key: string]: unknown;
}
