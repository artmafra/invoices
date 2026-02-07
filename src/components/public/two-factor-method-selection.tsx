"use client";

import { useState } from "react";
import { ArrowLeft, Key, Mail, Shield } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useResendTwoFactor } from "@/hooks/public/use-auth";
import { LoadingButton } from "@/components/shared/loading-button";
import { VerificationCodeInput } from "@/components/shared/verification-code-input";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { MultiStepContainer } from "@/components/ui/multi-step-container";

type TwoFactorMethod = "email" | "totp" | "backup";
type TwoFactorStep = "method-selection" | "verification";

interface TwoFactorMethodSelectionProps {
  userId: string;
  email: string;
  availableMethods: {
    email: boolean;
    totp: boolean;
    backup: boolean;
    preferred?: string;
  };
  onBack: () => void;
}

export function TwoFactorMethodSelection({
  userId,
  email,
  availableMethods,
  onBack,
}: TwoFactorMethodSelectionProps) {
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod | null>(
    // Only auto-select if there's only one method available (email or totp, not backup)
    availableMethods.email && !availableMethods.totp
      ? "email"
      : !availableMethods.email && availableMethods.totp
        ? "totp"
        : null, // Let user choose if multiple are available
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailCodeSent, setEmailCodeSent] = useState(
    // Only true if email is the only method (code was sent during credential verification)
    availableMethods.email && !availableMethods.totp,
  );

  // Hooks
  const resendTwoFactorMutation = useResendTwoFactor();

  // Check if multiple primary methods are available (excluding backup which is always fallback)
  const hasMultiplePrimaryMethods = availableMethods.email && availableMethods.totp;
  const hasSinglePrimaryMethod =
    (availableMethods.email || availableMethods.totp) && !hasMultiplePrimaryMethods;

  // Determine current step based on selection
  const currentStep: TwoFactorStep =
    !selectedMethod && hasMultiplePrimaryMethods ? "method-selection" : "verification";

  const handleMethodSelect = async (method: TwoFactorMethod) => {
    setSelectedMethod(method);
    setVerificationCode("");

    if (method === "email" && !emailCodeSent) {
      setIsLoading(true);
      try {
        await resendTwoFactorMutation.mutateAsync({ userId });
        setEmailCodeSent(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send email code");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || !selectedMethod) return;

    setIsLoading(true);

    try {
      // Use NextAuth's sign in with the two-factor provider
      const result = await signIn("two-factor", {
        userId,
        code: verificationCode,
        method: selectedMethod,
        redirect: false,
      });

      if (result?.error) {
        toast.error(
          selectedMethod === "backup"
            ? "Invalid backup code. Note: each backup code can only be used once."
            : "Invalid verification code",
        );
      } else if (result?.ok) {
        // Redirect to admin dashboard after successful 2FA verification
        window.location.href = "/admin";
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);

    try {
      await resendTwoFactorMutation.mutateAsync({ userId });
      setEmailCodeSent(true);
      toast.success("Verification code sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToMethodSelection = () => {
    setSelectedMethod(null);
    setVerificationCode("");
  };

  return (
    <MultiStepContainer currentStep={currentStep}>
      {/* Method Selection - only shown when multiple primary methods available */}
      <MultiStepContainer.Step name="method-selection">
        <div className="flex flex-col gap-space-xl">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
            <p className="text-balance text-muted-foreground">
              Select how you&apos;d like to verify your identity
            </p>
          </div>

          <div className="space-y-space-md">
            <Button
              onClick={() => handleMethodSelect("totp")}
              className="h-auto w-full justify-start p-card"
              variant="outline"
              disabled={isLoading}
            >
              <div className="flex w-full items-center gap-space-md">
                <Shield className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Authenticator App</div>
                  <div className="text-sm text-muted-foreground">Use your authenticator app</div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => handleMethodSelect("email")}
              variant="outline"
              className="h-auto w-full justify-start p-card"
              disabled={isLoading}
            >
              <div className="flex w-full items-center gap-space-md">
                <Mail className="h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Email Code</div>
                  <div className="text-sm text-muted-foreground">{email}</div>
                </div>
              </div>
            </Button>

            {availableMethods.backup && (
              <Button
                onClick={() => handleMethodSelect("backup")}
                variant="outline"
                className="h-auto w-full justify-start p-card"
                disabled={isLoading}
              >
                <div className="flex w-full items-center gap-space-md">
                  <Key className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-medium">Backup Code</div>
                    <div className="text-sm text-muted-foreground">Use a one-time backup code</div>
                  </div>
                </div>
              </Button>
            )}
          </div>

          <Button variant="ghost" onClick={onBack} className="w-full">
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Button>
        </div>
      </MultiStepContainer.Step>

      {/* Verification Form */}
      <MultiStepContainer.Step name="verification">
        <div className="flex flex-col gap-space-xl">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold">
              {selectedMethod === "backup" ? "Enter backup code" : "Enter verification code"}
            </h1>
            <p className="text-balance text-muted-foreground">
              {selectedMethod === "email"
                ? `We sent a code to ${email}`
                : selectedMethod === "totp"
                  ? "Enter the code from your authenticator app"
                  : "Enter one of your saved backup codes"}
            </p>
          </div>

          <div className="space-y-space-lg">
            <Field>
              <FieldLabel htmlFor="verification-code">
                {selectedMethod === "backup" ? "Backup Code" : "Verification Code"}
              </FieldLabel>
              <VerificationCodeInput
                id="verification-code"
                value={verificationCode}
                onChange={setVerificationCode}
                disabled={isLoading}
                maxLength={selectedMethod === "backup" ? 8 : 6}
                inputType={selectedMethod === "backup" ? "alphanumeric" : "numeric"}
              />
            </Field>

            <LoadingButton
              onClick={handleVerifyCode}
              loading={isLoading}
              loadingText="Verifying..."
              disabled={
                selectedMethod === "backup"
                  ? verificationCode.length !== 8
                  : verificationCode.length !== 6
              }
              className="w-full"
            >
              {selectedMethod === "backup" ? "Use Backup Code" : "Verify Code"}
            </LoadingButton>

            {selectedMethod === "email" && (
              <Button
                variant="ghost"
                onClick={handleResendEmail}
                disabled={isLoading}
                className="w-full"
              >
                Resend email code
              </Button>
            )}

            {/* Show backup code option when on primary method */}
            {selectedMethod !== "backup" && availableMethods.backup && hasSinglePrimaryMethod && (
              <Button
                variant="ghost"
                onClick={() => handleMethodSelect("backup")}
                className="w-full"
                disabled={isLoading}
              >
                <Key className="h-4 w-4" />
                Use backup code instead
              </Button>
            )}

            {/* Show method selection link when multiple methods available */}
            {hasMultiplePrimaryMethods && (
              <Button
                variant="ghost"
                onClick={handleBackToMethodSelection}
                className="w-full"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Use different method
              </Button>
            )}

            {/* Show backup code option in method selection area when only one primary method but backup available */}
            {!hasMultiplePrimaryMethods && selectedMethod === "backup" && (
              <Button
                variant="ghost"
                onClick={() => handleMethodSelect(availableMethods.totp ? "totp" : "email")}
                className="w-full"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Use {availableMethods.totp ? "authenticator app" : "email code"} instead
              </Button>
            )}
          </div>
        </div>
      </MultiStepContainer.Step>
    </MultiStepContainer>
  );
}
