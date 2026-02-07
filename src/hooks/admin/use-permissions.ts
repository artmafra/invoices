import { useQuery } from "@tanstack/react-query";
import type { PermissionGroup, PermissionResponse } from "@/types/permissions/permission-api.types";
import { apiErrorFromResponseBody } from "@/lib/api-request-error";
import { PERMISSIONS_QUERY_KEYS } from "@/hooks/admin/permissions.query-keys";

// =============================================================================
// Hooks
// =============================================================================

// Get all permissions grouped by resource
export const usePermissions = () => {
  return useQuery({
    queryKey: PERMISSIONS_QUERY_KEYS.all(),
    queryFn: async (): Promise<PermissionGroup[]> => {
      const response = await fetch("/api/admin/permissions");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, "Failed to fetch permissions");
      }

      return result as PermissionGroup[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - permissions don't change often
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory
  });
};

// Helper to format resource name for display
export function formatResourceName(resource: string): string {
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}

// Helper to format action name for display
export function formatActionName(action: string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

// Helper to get permission string
export function getPermissionString(permission: PermissionResponse): string {
  return `${permission.resource}.${permission.action}`;
}
