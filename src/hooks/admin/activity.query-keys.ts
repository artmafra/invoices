import type { ActivityFilters } from "@/types/common/activity.types";

// =============================================================================
// Query Keys
// =============================================================================

export const ACTIVITY_QUERY_KEYS = {
  all: ["admin", "activity"] as const,
  list: (filters: ActivityFilters) => [...ACTIVITY_QUERY_KEYS.all, filters] as const,
  filters: () => [...ACTIVITY_QUERY_KEYS.all, "filters"] as const,
  verify: () => [...ACTIVITY_QUERY_KEYS.all, "verify"] as const,
} as const;
