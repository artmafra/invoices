import type { GetLoginHistoryQuery } from "@/validations/login-history.validations";

/**
 * Query keys for login history-related queries
 */
export const LOGIN_HISTORY_QUERY_KEYS = {
  all: ["profile", "login-history"] as const,
  list: (filters: GetLoginHistoryQuery) => [...LOGIN_HISTORY_QUERY_KEYS.all, filters] as const,
  recent: (limit: number) => [...LOGIN_HISTORY_QUERY_KEYS.all, "recent", limit] as const,
} as const;
