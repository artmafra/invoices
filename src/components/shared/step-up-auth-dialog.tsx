"use client";

import { useCallback, useMemo, useState } from "react";
<<<<<<< HEAD
import { Fingerprint, KeyRound, Loader2 } from "lucide-react";
=======
import { Fingerprint, KeyRound, Loader2, Shield } from "lucide-react";
>>>>>>> relax
import { useTranslations } from "next-intl";
import { useAuthenticateWithPasskey } from "@/hooks/public/use-passkey";
import { useStepUpVerify } from "@/hooks/public/use-step-up-auth";
import { LoadingButton } from "@/components/shared/loading-button";
<<<<<<< HEAD
=======
import { VerificationCodeInput } from "@/components/shared/verification-code-input";
>>>>>>> relax
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiStepContainer } from "@/components/ui/multi-step-container";

interface StepUpAuthDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when step-up auth succeeds - receives stepUpAuthAt timestamp and secure token */
  onSuccess: (stepUpAuthAt: number, stepUpToken: string) => void;
  /** Whether the user has a password set */
  hasPassword: boolean;
  /** Whether the user has passkeys registered */
  hasPasskeys: boolean;
<<<<<<< HEAD
=======
  /** Whether the user has TOTP configured */
  hasTotp: boolean;
>>>>>>> relax
  /** Title override for the dialog */
  title?: string;
  /** Description override for the dialog */
  description?: string;
}

<<<<<<< HEAD
type StepUpStep = "method-selection" | "password" | "passkey";
=======
type StepUpStep = "method-selection" | "password" | "passkey" | "totp";
>>>>>>> relax

/**
 * Step-up authentication dialog component.
 * Prompts user to re-authenticate using password or passkey
 * before performing sensitive security operations.
 */
export function StepUpAuthDialog({
  open,
  onOpenChange,
  onSuccess,
  hasPassword,
  hasPasskeys,
<<<<<<< HEAD
=======
  hasTotp,
>>>>>>> relax
  title,
  description,
}: StepUpAuthDialogProps) {
  const t = useTranslations("profile.stepUpAuth");
  const tc = useTranslations("common");

  const [password, setPassword] = useState("");
<<<<<<< HEAD
=======
  const [totpCode, setTotpCode] = useState("");
>>>>>>> relax

  const passkeyAuthMutation = useAuthenticateWithPasskey();
  const stepUpVerifyMutation = useStepUpVerify();

  // Derive loading state from mutations
  const isVerifying = stepUpVerifyMutation.isPending || passkeyAuthMutation.isPending;

  // Derive the initial step based on available methods
  const defaultStep = useMemo(() => {
<<<<<<< HEAD
    if (hasPassword && !hasPasskeys) return "password";
    if (hasPasskeys && !hasPassword) return "passkey";
    return "method-selection";
  }, [hasPassword, hasPasskeys]);
=======
    // Count available methods
    const methodCount = [hasPassword, hasPasskeys, hasTotp].filter(Boolean).length;

    // If multiple methods, show selection
    if (methodCount > 1) return "method-selection";

    // Single method - go directly to it
    if (hasPassword) return "password";
    if (hasPasskeys) return "passkey";
    if (hasTotp) return "totp";

    return "method-selection";
  }, [hasPassword, hasPasskeys, hasTotp]);
>>>>>>> relax

  const [currentStep, setCurrentStep] = useState<StepUpStep>(defaultStep);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset state when dialog closes (derived state pattern)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setPassword("");
<<<<<<< HEAD
=======
      setTotpCode("");
>>>>>>> relax
      setCurrentStep(defaultStep);
    }
  }

  // Handle dialog open/close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      onOpenChange(newOpen);
    },
    [onOpenChange],
  );

  const handlePasswordSubmit = useCallback(async () => {
    if (!password.trim()) {
      return;
    }

    const result = await stepUpVerifyMutation.mutateAsync({
      method: "password",
      password,
    });

    onSuccess(result.stepUpAuthAt, result.stepUpToken);
    onOpenChange(false);
  }, [password, stepUpVerifyMutation, onSuccess, onOpenChange]);

  const handlePasskeySubmit = useCallback(async () => {
    // Perform WebAuthn authentication with step-up purpose
    // This returns a verification token proving the passkey was authenticated server-side
    const passkeyResult = await passkeyAuthMutation.mutateAsync({ purpose: "step-up" });

    if (!passkeyResult.passkeyVerificationToken) {
      return;
    }

    // Verify with step-up endpoint using the verification token
    const result = await stepUpVerifyMutation.mutateAsync({
      method: "passkey",
      passkeyVerificationToken: passkeyResult.passkeyVerificationToken,
    });

    onSuccess(result.stepUpAuthAt, result.stepUpToken);
    onOpenChange(false);
  }, [passkeyAuthMutation, stepUpVerifyMutation, onSuccess, onOpenChange]);

<<<<<<< HEAD
  const showMethodSelection = hasPassword && hasPasskeys && currentStep === "method-selection";
  const showPasswordForm = currentStep === "password";
  const showPasskeyPrompt = currentStep === "passkey";
=======
  const handleTotpSubmit = useCallback(async () => {
    if (totpCode.length !== 6) {
      return;
    }

    const result = await stepUpVerifyMutation.mutateAsync({
      method: "totp",
      code: totpCode,
    });

    onSuccess(result.stepUpAuthAt, result.stepUpToken);
    onOpenChange(false);
  }, [totpCode, stepUpVerifyMutation, onSuccess, onOpenChange]);

  const showMethodSelection =
    (hasPassword || hasPasskeys || hasTotp) &&
    [hasPassword, hasPasskeys, hasTotp].filter(Boolean).length > 1 &&
    currentStep === "method-selection";
  const showPasswordForm = currentStep === "password";
  const showPasskeyPrompt = currentStep === "passkey";
  const showTotpForm = currentStep === "totp";
>>>>>>> relax

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title || t("title")}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <DialogDescription>{description || t("description")}</DialogDescription>

          <MultiStepContainer currentStep={currentStep} onStepChange={setCurrentStep}>
            {/* Method Selection */}
            <MultiStepContainer.Step name="method-selection">
              {showMethodSelection && (
                <div className="space-y-space-md">
                  <p className="text-muted-foreground text-sm">{t("selectMethod")}</p>
                  <div className="grid gap-space-md">
<<<<<<< HEAD
                    <Button
                      variant="outline"
                      className="justify-start gap-space-md h-auto py-space-md"
                      onClick={() => setCurrentStep("password")}
                    >
                      <KeyRound className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">{t("methods.password.title")}</div>
                        <div className="text-muted-foreground text-xs">
                          {t("methods.password.description")}
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-space-md h-auto py-space-md"
                      onClick={() => setCurrentStep("passkey")}
                    >
                      <Fingerprint className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">{t("methods.passkey.title")}</div>
                        <div className="text-muted-foreground text-xs">
                          {t("methods.passkey.description")}
                        </div>
                      </div>
                    </Button>
=======
                    {hasPassword && (
                      <Button
                        variant="outline"
                        className="justify-start gap-space-md h-auto py-space-md"
                        onClick={() => setCurrentStep("password")}
                      >
                        <KeyRound className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">{t("methods.password.title")}</div>
                          <div className="text-muted-foreground text-xs">
                            {t("methods.password.description")}
                          </div>
                        </div>
                      </Button>
                    )}
                    {hasPasskeys && (
                      <Button
                        variant="outline"
                        className="justify-start gap-space-md h-auto py-space-md"
                        onClick={() => setCurrentStep("passkey")}
                      >
                        <Fingerprint className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">{t("methods.passkey.title")}</div>
                          <div className="text-muted-foreground text-xs">
                            {t("methods.passkey.description")}
                          </div>
                        </div>
                      </Button>
                    )}
                    {hasTotp && (
                      <Button
                        variant="outline"
                        className="justify-start gap-space-md h-auto py-space-md"
                        onClick={() => setCurrentStep("totp")}
                      >
                        <Shield className="h-5 w-5" />
                        <div className="text-left">
                          <div className="font-medium">{t("methods.totp.title")}</div>
                          <div className="text-muted-foreground text-xs">
                            {t("methods.totp.description")}
                          </div>
                        </div>
                      </Button>
                    )}
>>>>>>> relax
                  </div>
                </div>
              )}
            </MultiStepContainer.Step>

            {/* Password Form */}
            <MultiStepContainer.Step name="password">
              <form
                id="step-up-password-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePasswordSubmit();
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="step-up-password">{t("passwordLabel")}</FieldLabel>
                    <Input
                      id="step-up-password"
                      type="password"
                      placeholder={t("passwordPlaceholder")}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      disabled={isVerifying}
                    />
                  </Field>
                </FieldGroup>
              </form>
            </MultiStepContainer.Step>

            {/* Passkey Prompt */}
            <MultiStepContainer.Step name="passkey">
              <div className="space-y-space-lg">
                <div className="flex flex-col items-center gap-space-lg py-space-lg">
                  {isVerifying ? (
                    <>
                      <Loader2 className="text-muted-foreground h-12 w-12 animate-spin" />
                      <p className="text-muted-foreground text-sm">{t("passkeyWaiting")}</p>
                    </>
                  ) : (
                    <>
                      <Fingerprint className="text-muted-foreground h-12 w-12" />
                      <p className="text-muted-foreground text-center text-sm">
                        {t("passkeyPrompt")}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </MultiStepContainer.Step>
<<<<<<< HEAD
=======

            {/* TOTP Form */}
            <MultiStepContainer.Step name="totp">
              <form
                id="step-up-totp-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTotpSubmit();
                }}
              >
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="step-up-totp">{t("totpLabel")}</FieldLabel>
                    <VerificationCodeInput
                      id="step-up-totp"
                      value={totpCode}
                      onChange={setTotpCode}
                      disabled={isVerifying}
                      autoFocus
                      maxLength={6}
                      inputType="numeric"
                    />
                  </Field>
                </FieldGroup>
              </form>
            </MultiStepContainer.Step>
>>>>>>> relax
          </MultiStepContainer>
        </DialogBody>
        <DialogFooter className="sm:justify-between">
          <div>
<<<<<<< HEAD
            {((showPasswordForm && hasPasskeys) || (showPasskeyPrompt && hasPassword)) && (
=======
            {((showPasswordForm && (hasPasskeys || hasTotp)) ||
              (showPasskeyPrompt && (hasPassword || hasTotp)) ||
              (showTotpForm && (hasPassword || hasPasskeys))) && (
>>>>>>> relax
              <Button
                variant="outline"
                onClick={() => setCurrentStep("method-selection")}
                disabled={isVerifying}
              >
                ← {t("backToMethods")}
              </Button>
            )}
          </div>
          <div className="flex gap-space-sm">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isVerifying}>
              {tc("buttons.cancel")}
            </Button>
            {showPasswordForm && (
              <LoadingButton
                type="submit"
                form="step-up-password-form"
                loading={isVerifying}
                loadingText={t("verifying")}
              >
                {t("verifyButton")}
              </LoadingButton>
            )}
            {showPasskeyPrompt && !isVerifying && (
              <Button onClick={handlePasskeySubmit}>{t("usePasskeyButton")}</Button>
            )}
<<<<<<< HEAD
=======
            {showTotpForm && (
              <LoadingButton
                type="submit"
                form="step-up-totp-form"
                loading={isVerifying}
                loadingText={t("verifying")}
                disabled={totpCode.length !== 6}
              >
                {t("verifyButton")}
              </LoadingButton>
            )}
>>>>>>> relax
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
