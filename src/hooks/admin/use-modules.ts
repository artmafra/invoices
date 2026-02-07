import { useQuery } from "@tanstack/react-query";
import { apiErrorFromResponseBody } from "@/lib/api-request-error";
import type { App } from "@/components/apps-provider";

// =============================================================================
// Query Keys
// =============================================================================

export const QUERY_KEYS = {
  all: ["admin", "apps"] as const,
  allApps: () => [...QUERY_KEYS.all, "all"] as const,
} as const;

// Legacy export for backward compatibility
export const ALL_APPS_QUERY_KEY = QUERY_KEYS.allApps();

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get all apps (not filtered by user access).
 * Used by admin pages that need to manage permissions for all apps.
 */
export const useAllApps = () => {
  return useQuery({
    queryKey: QUERY_KEYS.allApps(),
    queryFn: async (): Promise<App[]> => {
      const response = await fetch("/api/admin/apps/enabled");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, "Failed to fetch apps");
      }

      return result as App[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes - apps rarely change
  });
};
