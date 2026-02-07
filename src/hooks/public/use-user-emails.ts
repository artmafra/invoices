import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  AddUserEmailRequest,
  UserEmailResponse,
  UserEmailsListResponse,
  VerifyUserEmailRequest,
} from "@/types/users/user-emails.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { PROFILE_QUERY_KEYS } from "@/hooks/public/profile.query-keys";
import { USER_EMAILS_QUERY_KEYS } from "@/hooks/public/user-emails.query-keys";

// Re-export for backward compatibility
export const QUERY_KEYS = USER_EMAILS_QUERY_KEYS;
export const USER_EMAILS_KEY = USER_EMAILS_QUERY_KEYS.all;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get all user emails
 */
export const useUserEmails = () => {
  const t = useTranslations("profile.hooks.emails");

  return useQuery({
    queryKey: QUERY_KEYS.all,
    queryFn: async (): Promise<UserEmailsListResponse> => {
      const response = await fetch("/api/profile/emails");
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as UserEmailsListResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Add a new email address
 */
export const useAddUserEmail = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.emails");

  return useMutation({
    mutationFn: async (data: AddUserEmailRequest) => {
      const response = await fetch("/api/profile/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.addFailed"));
      }

      return result as { email: UserEmailResponse; codeSent: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_EMAILS_KEY });
      toast.success(t("added"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.addFailed"),
        emailAlreadyAdded: t("errors.alreadyAdded"),
        emailInUse: t("errors.inUse"),
        fallback: t("errors.addFailed"),
      });
    },
  });
};

/**
 * Send verification code to an email
 */
export const useSendEmailVerification = () => {
  const t = useTranslations("profile.hooks.emails");

  return useMutation({
    mutationFn: async (emailId: string) => {
      const response = await fetch(`/api/profile/emails/${emailId}/verify`, {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.resendFailed"));
      }

      return result as { success: boolean; message: string; email: string };
    },
    onSuccess: (data) => {
      toast.success(t("codeSent", { email: data.email }));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.resendFailed"),
        emailAlreadyVerified: t("errors.alreadyVerified"),
        fallback: t("errors.resendFailed"),
      });
    },
  });
};

/**
 * Verify an email with a code
 */
export const useVerifyUserEmail = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.emails");

  return useMutation({
    mutationFn: async ({ emailId, code }: { emailId: string; code: string }) => {
      const response = await fetch(`/api/profile/emails/${emailId}/verify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code } satisfies VerifyUserEmailRequest),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.verifyFailed"));
      }

      return result as { email: UserEmailResponse; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_EMAILS_KEY });
      toast.success(t("verified"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.invalidCode"),
        invalidCode: t("errors.invalidCode"),
        emailAlreadyVerified: t("errors.alreadyVerified"),
        fallback: t("errors.verifyFailed"),
      });
    },
  });
};

/**
 * Remove an email address
 */
export const useRemoveUserEmail = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.emails");

  return useMutation({
    mutationFn: async (emailId: string) => {
      const response = await fetch(`/api/profile/emails/${emailId}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.removeFailed"));
      }

      return result as { success: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_EMAILS_KEY });
      toast.success(t("removed"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.removeFailed"),
        cannotRemovePrimary: t("errors.cannotRemovePrimary"),
        cannotRemoveOnlyEmail: t("errors.cannotRemoveOnly"),
        fallback: t("errors.removeFailed"),
      });
    },
  });
};

/**
 * Set an email as primary
 */
export const useSetPrimaryEmail = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.emails");

  return useMutation({
    mutationFn: async (emailId: string) => {
      const response = await fetch(`/api/profile/emails/${emailId}/primary`, {
        method: "PATCH",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.setPrimaryFailed"));
      }

      return result as { email: UserEmailResponse; message: string };
    },
    onSuccess: () => {
      // Invalidate emails list to show new primary
      queryClient.invalidateQueries({ queryKey: USER_EMAILS_KEY });
      // Cross-domain: Primary email change updates profile display
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      toast.success(t("primaryChanged"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.setPrimaryFailed"),
        emailNotVerified: t("errors.notVerified"),
        fallback: t("errors.setPrimaryFailed"),
      });
    },
  });
};
