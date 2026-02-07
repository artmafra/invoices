import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { SessionFilters, SessionsListResponse } from "@/types/sessions/sessions.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { SESSIONS_QUERY_KEYS as QUERY_KEYS } from "@/hooks/admin/sessions.query-keys";

// =============================================================================
// Hooks
// =============================================================================

// Get all active sessions (admin view)
export const useAdminSessions = (filters: SessionFilters = {}) => {
  const t = useTranslations("system.hooks.sessions");

  return useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: async (): Promise<SessionsListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.deviceType) params.append("deviceType", filters.deviceType);
      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());

      const url = params.toString() ? `/api/admin/sessions?${params}` : "/api/admin/sessions";
      const response = await fetch(url);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as SessionsListResponse;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

// Revoke a specific session (admin)
export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.sessions");

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.revokeFailed"));
      }

      return result;
    },
    onMutate: async (sessionId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.lists() });

      // Snapshot the previous value
      const previousData = queryClient.getQueriesData({ queryKey: QUERY_KEYS.lists() });

      // Optimistically remove the session from cache
      queryClient.setQueriesData(
        { queryKey: QUERY_KEYS.lists() },
        (old: SessionsListResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            sessions: old.sessions.filter((session) => session.id !== sessionId),
            total: old.total - 1,
          };
        },
      );

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      handleMutationError(error, {
        validation: t("errors.checkFields"),
        fallback: t("errors.revokeFailed"),
      });
    },
    onSuccess: () => {
      toast.success(t("revoked"));
    },
    onSettled: () => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
    },
  });
};

// Revoke all sessions for a user (admin)
export const useRevokeAllUserSessions = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.sessions");

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/sessions/users/${userId}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.revokeAllFailed"));
      }

      return result;
    },
    onSuccess: (_data) => {
      // Only invalidate session lists to remove all revoked sessions
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("allRevoked"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.checkFields"),
        fallback: t("errors.revokeAllFailed"),
      });
    },
  });
};

// Track login session (called after successful login)
export const useTrackSession = () => {
  const t = useTranslations("system.hooks.sessions");

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/sessions", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.trackFailed"));
      }

      return result;
    },
  });
};
