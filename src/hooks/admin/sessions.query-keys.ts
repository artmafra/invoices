import type { SessionFilters } from "@/types/sessions/sessions.types";

// =============================================================================
// Query Keys
// =============================================================================

export const SESSIONS_QUERY_KEYS = {
  all: ["admin", "sessions"] as const,
  lists: () => [...SESSIONS_QUERY_KEYS.all, "list"] as const,
  list: (filters: SessionFilters) => [...SESSIONS_QUERY_KEYS.lists(), filters] as const,
} as const;
