import { constants } from "node:quic";
import type { CompanyFilters } from "./use-companies";

export const COMPANIES_QUERY_KEYS = {
  all: ["admin", "companies"] as const,

  lists: () => [...COMPANIES_QUERY_KEYS.all, "list"] as const,

  list: (filters: CompanyFilters, page: number, limit: number) => [
    ...COMPANIES_QUERY_KEYS.lists(),
    { filters, page, limit },
  ],

  details: () => [...COMPANIES_QUERY_KEYS.all, "detail"],

  detail: (id: string) => [...COMPANIES_QUERY_KEYS.details(), id] as const,
};
