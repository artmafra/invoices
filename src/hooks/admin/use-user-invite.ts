import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  CreateUserInviteRequest,
  PendingUserInviteResponse,
} from "@/types/users/user-invites.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { USER_INVITES_QUERY_KEYS as QUERY_KEYS } from "@/hooks/admin/user-invites.query-keys";

// =============================================================================
// Hooks
// =============================================================================

// Get pending invites hook
export const usePendingUserInvites = () => {
  const t = useTranslations("system.hooks.invites");

  return useQuery({
    queryKey: QUERY_KEYS.pending(),
    queryFn: async (): Promise<PendingUserInviteResponse[]> => {
      const response = await fetch("/api/admin/users/invite");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as PendingUserInviteResponse[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Create invite hook
export const useCreateUserInvite = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.invites");

  return useMutation({
    mutationFn: async (data: CreateUserInviteRequest) => {
      const response = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.sendFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate pending invites list to show new invite
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pending() });
      toast.success(t("sent"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionSend"),
        userExists: t("errors.userExists"),
        fallback: t("errors.sendFailed"),
      });
    },
  });
};

// Cancel invite hook
export const useCancelUserInvite = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.invites");

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await fetch(`/api/admin/users/invite/${inviteId}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.cancelFailed"));
      }

      return result;
    },
    onMutate: async (inviteId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.pending() });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(QUERY_KEYS.pending());

      // Optimistically remove the invite from cache
      queryClient.setQueryData(
        QUERY_KEYS.pending(),
        (old: PendingUserInviteResponse[] | undefined) => {
          if (!old) return old;
          return old.filter((invite) => invite.id !== inviteId);
        },
      );

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.pending(), context.previousData);
      }
      handleMutationError(error, {
        forbidden: t("errors.noPermissionCancel"),
        fallback: t("errors.cancelFailed"),
      });
    },
    onSuccess: () => {
      toast.success(t("cancelled"));
    },
    onSettled: () => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pending() });
    },
  });
};

// Resend invite hook
export const useResendUserInvite = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.invites");

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const response = await fetch(`/api/admin/users/invite/${inviteId}`, {
        method: "PUT",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.resendFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate pending invites list to update resend timestamp
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pending() });
      toast.success(t("resent"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionResend"),
        fallback: t("errors.resendFailed"),
      });
    },
  });
};
