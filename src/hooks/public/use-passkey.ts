import {
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { PasskeyAuthenticateResponse, PasskeyResponse } from "@/types/auth/passkeys.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { PASSKEY_QUERY_KEYS } from "@/hooks/public/passkey.query-keys";
import { PROFILE_QUERY_KEYS } from "@/hooks/public/profile.query-keys";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get list of passkeys for current user
 */
export const usePasskeys = () => {
  const t = useTranslations("profile.hooks.passkeys");

  return useQuery({
    queryKey: PASSKEY_QUERY_KEYS.all,
    queryFn: async (): Promise<PasskeyResponse[]> => {
      const response = await fetch("/api/profile/passkeys");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as PasskeyResponse[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// ============================================================================
// Registration Hooks
// ============================================================================

/**
 * Register a new passkey
 */
export const useRegisterPasskey = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.passkeys");

  return useMutation({
    mutationFn: async (deviceName: string | undefined = undefined): Promise<PasskeyResponse> => {
      // Step 1: Get registration options from server
      const optionsResponse = await fetch("/api/profile/passkeys/register/options", {
        method: "POST",
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json().catch(() => ({}));
        throw apiErrorFromResponseBody(error, t("errors.optionsFailed"));
      }

      const options: PublicKeyCredentialCreationOptionsJSON = await optionsResponse.json();

      // Step 2: Start WebAuthn registration (browser prompt)
      const credential = await startRegistration({ optionsJSON: options });

      // Step 3: Verify registration with server
      const verifyResponse = await fetch("/api/profile/passkeys/register/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: credential,
          deviceName,
        }),
      });

      const result = await verifyResponse.json().catch(() => ({}));

      if (!verifyResponse.ok) {
        throw apiErrorFromResponseBody(result, t("errors.registerFailed"));
      }

      return result.passkey;
    },
    onSuccess: () => {
      // Only invalidate passkeys list to show new passkey
      queryClient.invalidateQueries({ queryKey: PASSKEY_QUERY_KEYS.all });
      // Profile displays passkey count, so invalidate to update security section
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      toast.success(t("registered"));
    },
    onError: (error: Error) => {
      // Handle user cancellation gracefully
      if (error.name === "NotAllowedError") {
        toast.error(t("errors.cancelled"));
        return;
      }
      handleMutationError(error, {
        validation: t("errors.verificationFailed"),
        challengeExpired: t("errors.challengeExpired"),
        invalidChallengeType: t("errors.invalidChallenge"),
        passkeyVerificationFailed: t("errors.verificationFailed"),
        fallback: t("errors.registerFailed"),
      });
    },
  });
};

// ============================================================================
// Management Hooks
// ============================================================================

/**
 * Rename a passkey
 */
export const useRenamePasskey = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.passkeys");

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch(`/api/profile/passkeys/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.renameFailed"));
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PASSKEY_QUERY_KEYS.all });
      toast.success(t("renamed"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        passkeyNotFound: t("errors.notFound"),
        fallback: t("errors.renameFailed"),
      });
    },
  });
};

/**
 * Delete a passkey
 */
export const useDeletePasskey = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("profile.hooks.passkeys");

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/profile/passkeys/${id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.deleteFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Only invalidate passkeys list to remove deleted passkey
      queryClient.invalidateQueries({ queryKey: PASSKEY_QUERY_KEYS.all });
      // Profile displays passkey count, so invalidate to update security section
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEYS.all });
      toast.success(t("deleted"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        passkeyNotFound: t("errors.notFound"),
        fallback: t("errors.deleteFailed"),
      });
    },
  });
};

// ============================================================================
// Authentication Hooks
// ============================================================================

interface AuthenticateWithPasskeyOptions {
  /** Email hint for the passkey (optional) */
  email?: string;
  /** Purpose of authentication - step-up returns a verification token */
  purpose?: "login" | "step-up";
}

/**
 * Authenticate with a passkey (for login page or step-up auth)
 * Returns userId that can be used with NextAuth signIn
 * When purpose="step-up", also returns passkeyVerificationToken
 */
export const useAuthenticateWithPasskey = () => {
  const t = useTranslations("profile.hooks.passkeys");

  return useMutation({
    mutationFn: async (
      options?: string | AuthenticateWithPasskeyOptions,
    ): Promise<PasskeyAuthenticateResponse> => {
      // Support both string (email) and object parameters for backwards compatibility
      const email = typeof options === "string" ? options : options?.email;
      const purpose = typeof options === "string" ? "login" : (options?.purpose ?? "login");

      // Step 1: Get authentication options from server
      const optionsResponse = await fetch("/api/auth/passkey/authenticate/options", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        const error = await optionsResponse.json().catch(() => ({}));
        throw apiErrorFromResponseBody(error, t("errors.authOptionsFailed"));
      }

      const authOptions: PublicKeyCredentialRequestOptionsJSON = await optionsResponse.json();

      // Step 2: Start WebAuthn authentication (browser prompt)
      const credential = await startAuthentication({ optionsJSON: authOptions });

      // Step 3: Verify authentication with server
      const verifyResponse = await fetch("/api/auth/passkey/authenticate/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: credential,
          purpose,
        }),
      });

      const result = await verifyResponse.json().catch(() => ({}));

      if (!verifyResponse.ok) {
        throw apiErrorFromResponseBody(result, t("errors.authFailed"));
      }

      return {
        userId: result.userId,
        ...(result.passkeyVerificationToken && {
          passkeyVerificationToken: result.passkeyVerificationToken,
        }),
      };
    },
    onError: (error: Error) => {
      // Handle user cancellation gracefully
      if (error.name === "NotAllowedError") {
        toast.error(t("errors.authCancelled"));
        return;
      }
      handleMutationError(error, {
        validation: t("errors.authFailed"),
        challengeExpired: t("errors.challengeExpired"),
        invalidChallengeType: t("errors.invalidChallenge"),
        passkeyAuthFailed: t("errors.authFailed"),
        fallback: t("errors.authVerifyFailed"),
      });
    },
  });
};
