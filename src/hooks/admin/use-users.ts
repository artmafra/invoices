import { useRouter } from "next/navigation";
import { useSessionContext } from "@/contexts/session-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  AdminUserFilters,
  AdminUsersListResponse,
  CreateUserRequest,
  EndImpersonationResponse,
  StartImpersonationResponse,
  UpdateUserRequest,
  UserAppPermissions,
  UserHoverCardResponse,
} from "@/types/users/users.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { USERS_QUERY_KEYS } from "./users.query-keys";

// =============================================================================
// Hooks
// =============================================================================

// Get users hook with pagination
export const useUsers = (filters: AdminUserFilters = {}) => {
  const t = useTranslations("system.hooks.users");

  return useQuery({
    queryKey: USERS_QUERY_KEYS.list(filters),
    queryFn: async (): Promise<AdminUsersListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.roleId && filters.roleId !== "all") params.append("roleId", filters.roleId);
      if (filters.status === "active") params.append("active", "true");
      if (filters.status === "inactive") params.append("active", "false");
      if (filters.sortBy) params.append("sortBy", filters.sortBy);
      if (filters.sortOrder) params.append("sortOrder", filters.sortOrder);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());

      const url = params.toString() ? `/api/admin/users?${params}` : "/api/admin/users";
      const response = await fetch(url);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as AdminUsersListResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Create user hook
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async (userData: CreateUserRequest) => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.createFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate user lists to show new user (detail/hover cards stay cached)
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      toast.success(t("created"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionCreate"),
        userExists: t("errors.userExists"),
        emailInUse: t("errors.emailInUse"),
        fallback: t("errors.createFailed"),
      });
    },
  });
};

// Toggle user status hook
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async ({
      userId,
      action,
    }: {
      userId: string;
      action: "activate" | "deactivate";
    }) => {
      const endpoint =
        action === "activate"
          ? `/api/admin/users/${userId}/reactivate`
          : `/api/admin/users/${userId}/deactivate`;

      const response = await fetch(endpoint, { method: "POST" });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(
          result,
          action === "activate" ? t("errors.activateFailed") : t("errors.deactivateFailed"),
        );
      }

      return result;
    },
    onMutate: async ({ userId, action }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      await queryClient.cancelQueries({ queryKey: USERS_QUERY_KEYS.hover(userId) });

      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: USERS_QUERY_KEYS.lists() });
      const previousHover = queryClient.getQueryData(USERS_QUERY_KEYS.hover(userId));

      // Optimistically update the cache
      const newIsActive = action === "activate";
      queryClient.setQueriesData(
        { queryKey: USERS_QUERY_KEYS.lists() },
        (old: AdminUsersListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.map((user) =>
              user.id === userId
                ? { ...user, isActive: newIsActive, updatedAt: new Date().toISOString() }
                : user,
            ),
          };
        },
      );

      // Update hover card cache
      queryClient.setQueryData(
        USERS_QUERY_KEYS.hover(userId),
        (old: UserHoverCardResponse | undefined) => {
          if (!old) return old;
          return { ...old, isActive: newIsActive, updatedAt: new Date().toISOString() };
        },
      );

      return { previousLists, previousHover };
    },
    onError: (error: Error, { action, userId }, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousHover) {
        queryClient.setQueryData(USERS_QUERY_KEYS.hover(userId), context.previousHover);
      }

      handleMutationError(error, {
        forbidden: t("errors.noPermissionUpdate"),
        notFound: t("errors.notFound"),
        fallback: action === "activate" ? t("errors.activateFailed") : t("errors.deactivateFailed"),
      });
    },
    onSuccess: (_, { action }) => {
      toast.success(action === "activate" ? t("activated") : t("deactivated"));
    },
    onSettled: (_, __, { userId }) => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.hover(userId) });
      // Cross-domain: User status affects sessions (deactivated users have sessions revoked)
      queryClient.invalidateQueries({ queryKey: ["admin", "sessions"] });
    },
  });
};

// Deactivate user hook (soft delete)
export const useDeactivateUser = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/deactivate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.deactivateFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate user lists to remove deactivated user
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      toast.success(t("deactivated"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionDeactivate"),
        notFound: t("errors.notFound"),
        fallback: t("errors.deactivateFailed"),
      });
    },
  });
};

// Permanently delete user hook
export const usePermanentlyDeleteUser = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.deleteFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate user lists to remove deleted user
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      toast.success(t("permanentlyDeleted"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionDelete"),
        notFound: t("errors.notFound"),
        fallback: t("errors.deleteFailed"),
      });
    },
  });
};

// Unlock user account hook
export const useUnlockUser = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}/unlock`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.unlockFailed"));
      }

      return result;
    },
    onMutate: () => {
      toast.loading(t("unlocking"), { id: "unlock-user" });
    },
    onSuccess: () => {
      // Only invalidate user lists to update lock status display
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      toast.success(t("unlocked"), { id: "unlock-user" });
    },
    onError: (error: Error) => {
      handleMutationError(
        error,
        {
          forbidden: t("errors.noPermissionUnlock"),
          notFound: t("errors.notFound"),
          fallback: t("errors.unlockFailed"),
        },
        "unlock-user",
      );
    },
  });
};

// Update user hook
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UpdateUserRequest }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
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
    onMutate: async ({ userId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      await queryClient.cancelQueries({ queryKey: USERS_QUERY_KEYS.detail(userId) });
      await queryClient.cancelQueries({ queryKey: USERS_QUERY_KEYS.hover(userId) });

      // Snapshot the previous values
      const previousLists = queryClient.getQueriesData({ queryKey: USERS_QUERY_KEYS.lists() });
      const previousDetail = queryClient.getQueryData(USERS_QUERY_KEYS.detail(userId));
      const previousHover = queryClient.getQueryData(USERS_QUERY_KEYS.hover(userId));

      // Optimistically update the cache (skip roleName - it's computed from roleId)
      const updates = { ...data, updatedAt: new Date().toISOString() };

      queryClient.setQueriesData(
        { queryKey: USERS_QUERY_KEYS.lists() },
        (old: AdminUsersListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.map((user) => (user.id === userId ? { ...user, ...updates } : user)),
          };
        },
      );

      // Update detail cache (same type as hover card)
      queryClient.setQueryData(
        USERS_QUERY_KEYS.detail(userId),
        (old: UserHoverCardResponse | undefined) => {
          if (!old) return old;
          return { ...old, ...updates };
        },
      );

      // Update hover card cache
      queryClient.setQueryData(
        USERS_QUERY_KEYS.hover(userId),
        (old: UserHoverCardResponse | undefined) => {
          if (!old) return old;
          return { ...old, ...updates };
        },
      );

      return { previousLists, previousDetail, previousHover };
    },
    onError: (error: Error, { userId }, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(USERS_QUERY_KEYS.detail(userId), context.previousDetail);
      }
      if (context?.previousHover) {
        queryClient.setQueryData(USERS_QUERY_KEYS.hover(userId), context.previousHover);
      }
      handleMutationError(error, {
        forbidden: t("errors.noPermissionUpdate"),
        emailInUse: t("errors.emailInUse"),
        notFound: t("errors.notFound"),
        fallback: t("errors.updateFailed"),
      });
    },
    onSuccess: () => {
      toast.success(t("updated"));
    },
    onSettled: (_, __, { userId }) => {
      // Always invalidate after mutation completes (syncs roleName and other computed fields)
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.detail(userId) });
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.hover(userId) });
    },
  });
};

// Start impersonation hook
export const useStartImpersonation = () => {
  const { update } = useSessionContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async (userId: string): Promise<StartImpersonationResponse> => {
      const response = await fetch(`/api/admin/users/${userId}/impersonate`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.impersonateFailed"));
      }

      return result as StartImpersonationResponse;
    },
    onSuccess: async (data) => {
      // Update the session with impersonated user data
      // Include the secure token to verify this request came from the API
      await update({
        impersonate: data.impersonatedUser,
        _impersonateToken: data.impersonateToken,
      });

      // Nuclear invalidation: Impersonation changes entire app context (different user, permissions, data)
      // This is one of the few cases where invalidating everything is correct and necessary
      await queryClient.invalidateQueries();

      toast.success(
        t("viewingAs", { name: data.impersonatedUser.name || data.impersonatedUser.email }),
      );

      // Navigate to admin root to avoid permission errors on current page
      router.push("/admin");
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionImpersonate"),
        notFound: t("errors.notFound"),
        cannotImpersonateSelf: t("errors.cannotImpersonateSelf"),
        alreadyImpersonating: t("errors.alreadyImpersonating"),
        cannotImpersonateSystem: t("errors.cannotImpersonateSystem"),
        userInactive: t("errors.userInactive"),
        fallback: t("errors.impersonateFailed"),
      });
    },
  });
};

// End impersonation hook
export const useEndImpersonation = () => {
  const { session, update } = useSessionContext();
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async (): Promise<EndImpersonationResponse> => {
      // Get the current impersonated user's ID
      const currentUserId = session?.user?.id;
      if (!currentUserId) {
        throw new Error("No active session");
      }

      const response = await fetch(`/api/admin/users/${currentUserId}/impersonate`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.endImpersonateFailed"));
      }

      return result as EndImpersonationResponse;
    },
    onSuccess: async (data) => {
      // Restore the original user session
      // Include the secure token to verify this request came from the API
      await update({
        endImpersonation: true,
        originalUser: data.originalUser,
        _endImpersonationToken: data.endImpersonationToken,
      });

      // Nuclear invalidation: Ending impersonation restores original user context (all cached data is now stale)
      // This is one of the few cases where invalidating everything is correct and necessary
      await queryClient.invalidateQueries();

      toast.success(t("impersonationEnded"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionImpersonate"),
        fallback: t("errors.endImpersonateFailed"),
      });
    },
  });
};

// =============================================================================
// App Permissions Hooks
// =============================================================================

// Get user app permissions hook
export const useUserAppPermissions = (userId: string | null) => {
  const t = useTranslations("system.hooks.users");

  return useQuery({
    queryKey: USERS_QUERY_KEYS.appPermissions(userId!),
    queryFn: async (): Promise<UserAppPermissions> => {
      const response = await fetch(`/api/admin/users/${userId}/app-permissions`);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.appPermissionsFailed"));
      }

      return result as UserAppPermissions;
    },
    enabled: !!userId,
  });
};

// Update user app permissions hook
export const useUpdateUserAppPermissions = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.users");

  return useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: Record<string, string[]>;
    }) => {
      const response = await fetch(`/api/admin/users/${userId}/app-permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.appPermissionsFailed"));
      }

      return result;
    },
    onSuccess: (_, { userId }) => {
      // Invalidate specific user's app permissions
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.appPermissions(userId) });
      // Only invalidate user lists (app permissions may be displayed in table)
      queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEYS.lists() });
      toast.success(t("appPermissionsUpdated"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionAppPermissions"),
        notFound: t("errors.notFound"),
        fallback: t("errors.appPermissionsFailed"),
      });
    },
  });
};

// Get user hover card data (lazy loaded on hover)
export const useUserHoverCard = (userId: string | null, enabled: boolean = false) => {
  const t = useTranslations("system.hooks.users");

  return useQuery({
    queryKey: USERS_QUERY_KEYS.hover(userId!),
    queryFn: async (): Promise<UserHoverCardResponse> => {
      const response = await fetch(`/api/admin/users/${userId}/hover`);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as UserHoverCardResponse;
    },
    enabled: enabled && !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - user data doesn't change often
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection time
  });
};
