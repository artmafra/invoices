import type { GetProfileSessionsQuery } from "@/validations/profile-sessions.validations";

/**
 * Query keys for user sessions-related queries
 */
export const USER_SESSIONS_QUERY_KEYS = {
  all: ["profile", "sessions"] as const,
  list: (filters: GetProfileSessionsQuery) => [...USER_SESSIONS_QUERY_KEYS.all, filters] as const,
} as const;
