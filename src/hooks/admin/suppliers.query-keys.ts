import type { SupplierFilters } from "./use-suppliers";

export const SUPPLIERS_QUERY_KEYS = {
  all: ["admin", "suppliers"] as const,

  lists: () => [...SUPPLIERS_QUERY_KEYS.all, "list"] as const,

  list: (filters: SupplierFilters, page: number, limit: number) =>
    [...SUPPLIERS_QUERY_KEYS.lists(), { filters, page, limit }] as const,

  details: () => [...SUPPLIERS_QUERY_KEYS.all, "detail"] as const,

  detail: (id: number) => [...SUPPLIERS_QUERY_KEYS.details(), id] as const,
};
