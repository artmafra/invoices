import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type {
  AcceptUserInviteRequest,
  AcceptUserInviteResponse,
  ValidateUserInviteResponse,
} from "@/types/users/user-invites.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";

// =============================================================================
// Query Keys
// =============================================================================

export const QUERY_KEYS = {
  all: ["invite-token"] as const,
  detail: (token: string) => [...QUERY_KEYS.all, token] as const,
} as const;

// =============================================================================
// Hooks
// =============================================================================

// Validate invite token hook - check if token is valid
export const useValidateUserInvite = (token: string | null) => {
  const t = useTranslations("auth.hooks.invite");

  return useQuery<ValidateUserInviteResponse>({
    queryKey: QUERY_KEYS.detail(token!),
    queryFn: async () => {
      if (!token) {
        return { valid: false, error: t("errors.noToken") };
      }

      const response = await fetch(`/api/auth/invite?token=${encodeURIComponent(token)}`);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof (result as { error?: unknown })?.error === "string"
            ? (result as { error: string }).error
            : t("errors.invalidLink");

        return { valid: false, error: message };
      }

      return result;
    },
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });
};

// Accept invite hook - create account with token
export const useAcceptUserInvite = () => {
  const t = useTranslations("auth.hooks.invite");

  return useMutation<AcceptUserInviteResponse, Error, AcceptUserInviteRequest>({
    mutationFn: async (data: AcceptUserInviteRequest) => {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.acceptFailed"));
      }

      return result;
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.invalidLink"),
        invalidInviteToken: t("errors.invalidLink"),
        userExists: t("errors.userExists"),
        emailInUse: t("errors.emailInUse"),
        fallback: t("errors.acceptFailed"),
      });
    },
  });
};
