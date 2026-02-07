import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  RegenerateBackupCodesResponse,
  TotpEnableRequest,
  TotpEnableResponse,
  TotpSetupResponse,
  TwoFactorStatusResponse,
} from "@/types/auth/auth.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { TWO_FA_QUERY_KEYS } from "@/hooks/public/2fa.query-keys";
import { PROFILE_QUERY_KEYS } from "@/hooks/public/profile.query-keys";

// Re-export for backward compatibility
export const QUERY_KEYS = TWO_FA_QUERY_KEYS;

// ============================================================================
// Status Hook
// ============================================================================

/**
 * Get 2FA status for current user
 */
export const use2FAStatus = () => {
  const t = useTranslations("profile.hooks.twoFactor");

  return useQuery({
    queryKey: QUERY_KEYS.all,
    queryFn: async (): Promise<TwoFactorStatusResponse> => {
      const response = await fetch("/api/profile/2fa");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as TwoFactorStatusResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// Email 2FA Hooks
// ============================================================================

/**
 * Send setup code for email 2FA
 */
export const useSetup2FAEmail = () => {
  const t = useTranslations("profile.hooks.twoFactor.email");

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/2fa/email/setup", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.sendFailed"));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("codeSent"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        fallback: t("errors.sendFailed"),
      });
    },
  });
};

/**
 * Verify code and enable email 2FA
 */
export const useEnable2FAEmail = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.twoFactor.email");

  return useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/profile/2fa/email/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.enableFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate 2FA status to show email method enabled
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      // Profile displays 2FA method count, so invalidate to update badge
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      toast.success(t("enabled"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.invalidCode"),
        invalid2faCode: t("errors.invalidCode"),
        email2faAlreadyEnabled: t("errors.alreadyEnabled"),
        codeRequired: t("errors.codeRequired"),
        fallback: t("errors.enableFailed"),
      });
    },
  });
};

/**
 * Disable email 2FA
 */
export const useDisable2FAEmail = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.twoFactor.email");

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/2fa/email/disable", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.disableFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate 2FA status to show email method disabled
      queryClient.invalidateQueries({ queryKey: ["user", "2fa-status"] });
      // Profile displays 2FA method count, so invalidate to update badge
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      toast.success(t("disabled"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        fallback: t("errors.disableFailed"),
      });
    },
  });
};

// ============================================================================
// TOTP 2FA Hooks
// ============================================================================

/**
 * Generate TOTP setup data (QR code, secret)
 */
export const useSetup2FATotp = () => {
  const t = useTranslations("profile.hooks.twoFactor.totp");

  return useMutation({
    mutationFn: async (): Promise<TotpSetupResponse> => {
      const response = await fetch("/api/profile/2fa/totp/setup", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.setupFailed"));
      }

      return result;
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        fallback: t("errors.setupFailed"),
      });
    },
  });
};

/**
 * Verify code and enable TOTP 2FA
 */
export const useEnable2FATotp = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.twoFactor.totp");

  return useMutation({
    mutationFn: async (data: TotpEnableRequest): Promise<TotpEnableResponse> => {
      const response = await fetch("/api/profile/2fa/totp/enable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.enableFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate 2FA status to show TOTP method enabled
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      // Profile displays 2FA method count, so invalidate to update badge
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      // Note: Success toast will be shown after user views backup codes
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.invalidCode"),
        invalid2faCode: t("errors.invalidCode"),
        fallback: t("errors.enableFailed"),
      });
    },
  });
};

/**
 * Disable TOTP 2FA
 */
export const useDisable2FATotp = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.twoFactor.totp");

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/profile/2fa/totp/disable", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.disableFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate 2FA status to show TOTP method disabled
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
      // Profile displays 2FA method count, so invalidate to update badge
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      toast.success(t("disabled"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        fallback: t("errors.disableFailed"),
      });
    },
  });
};

// ============================================================================
// Backup Codes Hooks
// ============================================================================

/**
 * Regenerate backup codes
 */
export const useRegenerateBackupCodes = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.twoFactor.backupCodes");

  return useMutation({
    mutationFn: async (): Promise<RegenerateBackupCodesResponse> => {
      const response = await fetch("/api/profile/2fa/backup-codes/regenerate", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.regenerateFailed"));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        totpNotEnabled: t("errors.totpRequired"),
        fallback: t("errors.regenerateFailed"),
      });
    },
  });
};

// ============================================================================
// Auth Flow Hooks (used during login)
// ============================================================================

/**
 * Resend 2FA code during login flow
 */
export const useResend2FACode = () => {
  const t = useTranslations("profile.hooks.twoFactor.resend");

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch("/api/auth/2fa/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.failed"));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t("success"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        fallback: t("errors.failed"),
      });
    },
  });
};
