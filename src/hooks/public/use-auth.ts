import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  ForgotPasswordRequest,
  ResetPasswordRequest,
  SessionRefreshRequest,
  TwoFactorResendRequest,
  ValidateResetTokenResponse,
} from "@/types/auth/auth.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";

// =============================================================================
// Query Keys
// =============================================================================

export const QUERY_KEYS = {
  all: ["reset-token"] as const,
  detail: (token: string) => [...QUERY_KEYS.all, token] as const,
} as const;

// =============================================================================
// Hooks
// =============================================================================

// Session refresh hook
export const useRefreshSession = () => {
  return useMutation({
    mutationFn: async (data: SessionRefreshRequest) => {
      const response = await fetch("/api/auth/session-refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, "Failed to refresh session");
      }

      return result;
    },
  });
};

// Two-factor authentication resend hook
export const useResendTwoFactor = () => {
  const t = useTranslations("auth.hooks.twoFactor");

  return useMutation({
    mutationFn: async (data: TwoFactorResendRequest) => {
      const response = await fetch("/api/auth/2fa/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("sendFailed"));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("codeSent"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        fallback: t("sendFailed"),
      });
    },
  });
};

// Forgot password hook - request password reset email
export const useForgotPassword = () => {
  const t = useTranslations("auth.hooks.passwordReset");

  return useMutation({
    mutationFn: async (data: ForgotPasswordRequest) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("sendFailed"));
      }

      return result;
    },
    onError: (error: Error) => {
      toast.error(error.message || t("sendFailed"));
    },
  });
};

// Validate reset token hook - check if token is valid
export const useValidateResetToken = (token: string | null) => {
  return useQuery<ValidateResetTokenResponse>({
    queryKey: QUERY_KEYS.detail(token!),
    queryFn: async () => {
      if (!token) {
        return { valid: false, error: "No reset token provided" };
      }

      const response = await fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof (result as { error?: unknown })?.error === "string"
            ? (result as { error: string }).error
            : "Invalid or expired reset link";

        return { valid: false, error: message };
      }

      return result;
    },
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
  });
};

// Reset password hook - set new password with token
export const useResetPassword = () => {
  const t = useTranslations("auth.hooks.passwordReset");

  return useMutation({
    mutationFn: async (data: ResetPasswordRequest) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("resetFailed"));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("success"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("invalidLink"),
        invalidResetToken: t("invalidLink"),
        fallback: t("resetFailed"),
      });
    },
  });
};
