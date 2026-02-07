import type { AdminSettingsFilters } from "@/hooks/admin/use-admin-settings";

// =============================================================================
// Query Keys
// =============================================================================

export const SETTINGS_QUERY_KEYS = {
  all: ["admin", "settings"] as const,
  lists: () => [...SETTINGS_QUERY_KEYS.all, "list"] as const,
  list: (filters: AdminSettingsFilters) => [...SETTINGS_QUERY_KEYS.all, filters] as const,
  categories: () => [...SETTINGS_QUERY_KEYS.all, "categories"] as const,
} as const;
