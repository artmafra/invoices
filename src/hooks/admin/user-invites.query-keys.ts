// =============================================================================
// Query Keys
// =============================================================================

export const USER_INVITES_QUERY_KEYS = {
  all: ["admin", "invites"] as const,
  pending: () => [...USER_INVITES_QUERY_KEYS.all, "pending"] as const,
} as const;
