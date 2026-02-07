import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  CreateRoleRequest,
  PaginatedRolesResponse,
  RoleFilters,
  RoleResponse,
  UpdateRoleRequest,
} from "@/types/common/roles.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { ROLES_QUERY_KEYS as QUERY_KEYS } from "@/hooks/admin/roles.query-keys";
import { USERS_QUERY_KEYS as USER_QUERY_KEYS } from "@/hooks/admin/users.query-keys";

// =============================================================================
// Hooks
// =============================================================================

// Get paginated roles hook (for admin listing)
export const useRoles = (filters: RoleFilters = {}) => {
  const { enabled = true, search, sortBy, sortOrder, page = 1, limit = 20 } = filters;
  const t = useTranslations("system.hooks.roles");

  return useQuery({
    queryKey: QUERY_KEYS.list({ search, sortBy, sortOrder, page, limit }),
    queryFn: async (): Promise<PaginatedRolesResponse> => {
      const params = new URLSearchParams();

      if (search) params.append("search", search);
      if (sortBy) params.append("sortBy", sortBy);
      if (sortOrder) params.append("sortOrder", sortOrder);
      params.append("page", String(page));
      params.append("limit", String(limit));

      const url = `/api/admin/roles?${params}`;
      const response = await fetch(url);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as PaginatedRolesResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes - roles rarely change
    enabled,
  });
};

// Get assignable roles hook (for dropdowns/selects - returns all without pagination)
export const useAssignableRoles = (enabled: boolean = true) => {
  const t = useTranslations("system.hooks.roles");

  return useQuery({
    queryKey: QUERY_KEYS.assignable(),
    queryFn: async (): Promise<RoleResponse[]> => {
      const response = await fetch("/api/admin/roles?assignable=true");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      // Extract roles from paginated response
      const paginatedResult = result as PaginatedRolesResponse;
      return paginatedResult.roles;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
  });
};

// Note: useRole hook removed - no corresponding GET /api/admin/roles/:roleId endpoint exists
// If needed in the future, create the API endpoint first

// Create role hook
export const useCreateRole = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.roles");

  return useMutation({
    mutationFn: async (roleData: CreateRoleRequest) => {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roleData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.createFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate role lists and assignable roles dropdown
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignable() });
      // Cross-domain: New role appears in user management dropdowns
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.lists() });
      toast.success(t("created"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionCreate"),
        roleExists: t("errors.roleExists"),
        validation: t("errors.checkDetails"),
        fallback: t("errors.createFailed"),
      });
    },
  });
};

// Update role hook
export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.roles");

  return useMutation({
    mutationFn: async ({ roleId, data }: { roleId: string; data: UpdateRoleRequest }) => {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.updateFailed"));
      }

      return result;
    },
    onMutate: async ({ roleId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.lists() });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.assignable() });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.detail(roleId) });

      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: QUERY_KEYS.lists() });
      const previousAssignable = queryClient.getQueryData(QUERY_KEYS.assignable());
      const previousDetail = queryClient.getQueryData(QUERY_KEYS.detail(roleId));

      // Optimistically update the cache
      const updates = { ...data, updatedAt: new Date().toISOString() };

      queryClient.setQueriesData(
        { queryKey: QUERY_KEYS.lists() },
        (old: PaginatedRolesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            roles: old.roles.map((role) => (role.id === roleId ? { ...role, ...updates } : role)),
          };
        },
      );

      // Update assignable roles cache
      queryClient.setQueryData(QUERY_KEYS.assignable(), (old: RoleResponse[] | undefined) => {
        if (!old) return old;
        return old.map((role) => (role.id === roleId ? { ...role, ...updates } : role));
      });

      // Update detail cache
      queryClient.setQueryData(QUERY_KEYS.detail(roleId), (old: RoleResponse | undefined) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return { previousLists, previousAssignable, previousDetail };
    },
    onError: (error: Error, { roleId }, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousAssignable) {
        queryClient.setQueryData(QUERY_KEYS.assignable(), context.previousAssignable);
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(QUERY_KEYS.detail(roleId), context.previousDetail);
      }
      handleMutationError(error, {
        forbidden: t("errors.noPermissionUpdate"),
        roleNameExists: t("errors.roleExists"),
        fallback: t("errors.updateFailed"),
      });
    },
    onSuccess: () => {
      toast.success(t("updated"));
    },
    onSettled: (_, __, { roleId }) => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignable() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.detail(roleId) });
      // Cross-domain: Role name changes appear in users list
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.lists() });
    },
  });
};

// Delete role hook
export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.roles");

  return useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.deleteFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate role lists and assignable roles dropdown
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.assignable() });
      // Cross-domain: Deleted role no longer appears in user management
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.lists() });
      toast.success(t("deleted"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionDelete"),
        fallback: t("errors.deleteFailed"),
      });
    },
  });
};
