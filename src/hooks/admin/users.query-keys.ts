import type { AdminUserFilters } from "@/types/users/users.types";

// =============================================================================
// Query Keys
// =============================================================================

export const USERS_QUERY_KEYS = {
  all: ["admin", "users"] as const,
  lists: () => [...USERS_QUERY_KEYS.all, "list"] as const,
  list: (filters: AdminUserFilters) => [...USERS_QUERY_KEYS.lists(), filters] as const,
  detail: (userId: string) => [...USERS_QUERY_KEYS.all, userId] as const,
  hover: (userId: string) => [...USERS_QUERY_KEYS.all, userId, "hover"] as const,
  appPermissions: (userId: string) => [...USERS_QUERY_KEYS.all, userId, "app-permissions"] as const,
} as const;
