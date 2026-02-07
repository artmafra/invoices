import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  ProfileSessionResponse,
  ProfileSessionsListResponse,
} from "@/types/sessions/sessions.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import type { GetProfileSessionsQuery } from "@/validations/profile-sessions.validations";
import { USER_SESSIONS_QUERY_KEYS } from "./user-sessions.query-keys";

// =============================================================================
// Query Keys (Re-export for backward compatibility)
// =============================================================================

export const QUERY_KEYS = USER_SESSIONS_QUERY_KEYS;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to fetch current user's sessions with optional filtering and sorting
 */
export const useUserSessions = (filters: GetProfileSessionsQuery = {}) => {
  const t = useTranslations("profile.hooks.sessions");

  return useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async (): Promise<ProfileSessionsListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.set("search", filters.search);
      if (filters.deviceType) params.set("deviceType", filters.deviceType);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);

      const url = `/api/profile/sessions${params.toString() ? `?${params}` : ""}`;
      const response = await fetch(url);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as ProfileSessionsListResponse;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Hook to revoke a specific session
 */
export const useRevokeUserSession = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.sessions");

  return useMutation({
    mutationFn: async (sessionId: string): Promise<{ sessionId: string }> => {
      const response = await fetch(`/api/profile/sessions/${sessionId}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.revokeFailed"));
      }

      return result;
    },
    onMutate: async (sessionId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.all });

      // Snapshot previous data
      const previousData = queryClient.getQueriesData({ queryKey: QUERY_KEYS.all });

      // Optimistically remove session from all lists
      queryClient.setQueriesData<ProfileSessionsListResponse>(
        { queryKey: QUERY_KEYS.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            sessions: old.sessions.filter((session) => session.id !== sessionId),
          };
        },
      );

      return { previousData };
    },
    onSuccess: () => {
      toast.success(t("revoked"));
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      handleMutationError(error, {
        fallback: t("errors.revokeFailed"),
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};

/**
 * Hook to revoke all other sessions (except current)
 */
export const useRevokeAllOtherSessions = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.sessions");

  return useMutation({
    mutationFn: async (): Promise<{ revokedCount: number }> => {
      const response = await fetch(`/api/profile/sessions/all`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.revokeAllFailed"));
      }

      return result;
    },
    onMutate: async (currentSessionId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.all });

      // Snapshot previous data
      const previousData = queryClient.getQueriesData({ queryKey: QUERY_KEYS.all });

      // Optimistically keep only current session in all lists
      queryClient.setQueriesData<ProfileSessionsListResponse>(
        { queryKey: QUERY_KEYS.all },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            sessions: old.sessions.filter((session) => session.id === currentSessionId),
          };
        },
      );

      return { previousData };
    },
    onSuccess: () => {
      toast.success(t("allRevoked"));
    },
    onError: (error: Error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      handleMutationError(error, {
        fallback: t("errors.revokeAllFailed"),
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });
};

// Re-export type for convenience
export type { ProfileSessionResponse };
