import type { RoleFilters } from "@/types/common/roles.types";

// =============================================================================
// Query Keys
// =============================================================================

export const ROLES_QUERY_KEYS = {
  all: ["admin", "roles"] as const,
  lists: () => [...ROLES_QUERY_KEYS.all, "list"] as const,
  list: (filters: Partial<RoleFilters>) => [...ROLES_QUERY_KEYS.lists(), filters] as const,
  assignable: () => [...ROLES_QUERY_KEYS.all, "assignable"] as const,
  detail: (roleId: string) => [...ROLES_QUERY_KEYS.all, roleId] as const,
} as const;
