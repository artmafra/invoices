import type { ServiceFilters } from "./use-services";

export const SERVICES_QUERY_KEYS = {
  all: ["admin", "services"] as const,

  lists: () => [...SERVICES_QUERY_KEYS.all, "list"] as const,

  list: (filters: ServiceFilters) => [...SERVICES_QUERY_KEYS.lists(), { filters }] as const,

  details: () => [...SERVICES_QUERY_KEYS.all, "detail"] as const,

  detail: (id: string) => [...SERVICES_QUERY_KEYS.details(), id] as const,
};
