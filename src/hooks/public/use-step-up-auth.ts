import { useCallback, useState } from "react";
import { useSessionContext } from "@/contexts/session-context";
import { useMutation } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { StepUpAuthRequest, StepUpAuthResponse } from "@/types/auth/step-up-auth.types";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import { STEP_UP_CONFIG } from "@/lib/auth/policy";
import { useUserProfile } from "@/hooks/public/use-profile";

// ========================================
// Step-Up Verify Mutation Hook
// ========================================

/**
 * Hook to verify step-up authentication via password or passkey.
 * Handles the API call to /api/auth/step-up and error handling via toast.
 */
export const useStepUpVerify = () => {
  const t = useTranslations("profile.hooks.stepUp");

  return useMutation({
    mutationFn: async (data: StepUpAuthRequest): Promise<StepUpAuthResponse> => {
      const response = await fetch("/api/auth/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.verifyFailed"));
      }

      return result as StepUpAuthResponse;
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        validation: t("errors.invalidCredentials"),
        rateLimitExceeded: t("errors.tooManyAttempts"),
        fallback: t("errors.verifyFailed"),
      });
    },
  });
};

// ========================================

interface UseStepUpAuthOptions {
  /** Custom grace period in milliseconds (default: 10 minutes) */
  gracePeriod?: number;
}

interface UseStepUpAuthReturn {
  /**
   * Whether step-up authentication is required.
   * True if no recent strong auth and user has auth methods available.
   */
  requiresStepUp: boolean;

  /**
   * Whether step-up auth is currently verified (within grace period)
   */
  isVerified: boolean;

  /**
   * Whether the step-up dialog should be shown
   */
  isDialogOpen: boolean;

  /**
   * Open the step-up auth dialog
   */
  openDialog: () => void;

  /**
   * Close the step-up auth dialog
   */
  closeDialog: () => void;

  /**
   * Callback to pass to StepUpAuthDialog onSuccess
   * Updates session with new stepUpAuthAt timestamp using secure token
   */
  handleStepUpSuccess: (stepUpAuthAt: number, stepUpToken: string) => Promise<void>;

  /**
   * Whether the user has a password set
   */
  hasPassword: boolean;

  /**
   * Whether the user has passkeys registered
   */
  hasPasskeys: boolean;

  /**
   * Execute an action that requires step-up auth.
   * Opens dialog if verification needed, otherwise executes immediately.
   */
  withStepUp: (action: () => void | Promise<void>) => void;
}

/**
 * Hook to manage step-up authentication for security-sensitive actions.
 *
 * Usage:
 * ```tsx
 * const {
 *   isDialogOpen,
 *   openDialog,
 *   closeDialog,
 *   handleStepUpSuccess,
 *   hasPassword,
 *   hasPasskeys,
 *   withStepUp,
 * } = useStepUpAuth();
 *
 * // Wrap actions that need step-up auth
 * const handleDisable2FA = () => {
 *   withStepUp(async () => {
 *     await disable2FAMutation.mutateAsync();
 *   });
 * };
 *
 * // Render the dialog
 * <StepUpAuthDialog
 *   open={isDialogOpen}
 *   onOpenChange={closeDialog}
 *   onSuccess={handleStepUpSuccess}
 *   hasPassword={hasPassword}
 *   hasPasskeys={hasPasskeys}
 * />
 * ```
 */
export function useStepUpAuth(options: UseStepUpAuthOptions = {}): UseStepUpAuthReturn {
  const { gracePeriod = STEP_UP_CONFIG.WINDOW_MS } = options;

  const { session, update: updateSession } = useSessionContext();
  const { data: profile } = useUserProfile();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);

  // Auth capabilities from profile
  const hasPassword = profile?.hasPassword ?? false;
  const hasPasskeys = profile?.hasPasskeys ?? false;

  // Check if user can perform step-up auth (has at least one method)
  const canStepUp = hasPassword || hasPasskeys;

  // Check if step-up is verified (within grace period)
  const isVerified = useCallback(() => {
    const stepUpAuthAt = session?.user?.stepUpAuthAt;
    const lastAuthAt = session?.user?.lastAuthAt;

    // Use the most recent of stepUpAuthAt or lastAuthAt
    const lastStrongAuth = Math.max(stepUpAuthAt || 0, lastAuthAt || 0);

    if (!lastStrongAuth) return false;

    const now = Date.now();
    return now - lastStrongAuth < gracePeriod;
  }, [session?.user?.stepUpAuthAt, session?.user?.lastAuthAt, gracePeriod]);

  // Whether step-up is required (can do it and not currently verified)
  const requiresStepUp = canStepUp && !isVerified();

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
    setPendingAction(null);
  }, []);

  const handleStepUpSuccess = useCallback(
    async (stepUpAuthAt: number, stepUpToken: string) => {
      // Update session with new stepUpAuthAt using secure token
      await updateSession({ stepUpAuthAt, _stepUpToken: stepUpToken });

      // Execute pending action if any
      if (pendingAction) {
        try {
          await pendingAction();
        } finally {
          setPendingAction(null);
        }
      }
    },
    [updateSession, pendingAction],
  );

  const withStepUp = useCallback(
    (action: () => void | Promise<void>) => {
      if (!canStepUp) {
        // No auth methods available, just execute
        action();
        return;
      }

      if (isVerified()) {
        // Already verified, execute immediately
        action();
        return;
      }

      // Need step-up, store action and open dialog
      setPendingAction(() => action);
      setIsDialogOpen(true);
    },
    [canStepUp, isVerified],
  );

  return {
    requiresStepUp,
    isVerified: isVerified(),
    isDialogOpen,
    openDialog,
    closeDialog,
    handleStepUpSuccess,
    hasPassword,
    hasPasskeys,
    withStepUp,
  };
}
