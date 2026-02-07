"use client";

import { useState } from "react";
import { useSessionContext } from "@/contexts/session-context";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  useCancelEmailChange,
  useChangeEmail,
  useVerifyEmailChange,
} from "@/hooks/public/use-profile";
import { LoadingButton } from "@/components/shared/loading-button";
import { VerificationCodeInput } from "@/components/shared/verification-code-input";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiStepContainer } from "@/components/ui/multi-step-container";

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onEmailChanged: () => void;
}

type Step = "email" | "verification";

export function ChangeEmailModal({
  isOpen,
  onClose,
  currentEmail,
  onEmailChanged,
}: ChangeEmailModalProps) {
  const { update } = useSessionContext();
  const t = useTranslations("profile.changeEmail");
  const tc = useTranslations("common.buttons");
  const changeEmailMutation = useChangeEmail();
  const verifyEmailMutation = useVerifyEmailChange();
  const cancelEmailMutation = useCancelEmailChange();
  const [step, setStep] = useState<Step>("email");
  const [newEmail, setNewEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = () => {
    setStep("email");
    setNewEmail("");
    setVerificationCode("");
    setIsLoading(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.trim()) {
      toast.error(t("errors.emptyEmail"));
      return;
    }

    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      toast.error(t("errors.sameEmail"));
      return;
    }

    setIsLoading(true);

    try {
      await changeEmailMutation.mutateAsync({ newEmail });

      toast.success(t("codeSent", { email: newEmail }));
      setStep("verification");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.emptyEmail"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verificationCode.trim()) {
      toast.error(t("errors.emptyCode"));
      return;
    }

    if (verificationCode.length !== 6) {
      toast.error(t("errors.invalidCode"));
      return;
    }

    setIsLoading(true);

    try {
      await verifyEmailMutation.mutateAsync({ code: verificationCode });

      // Update the session with the new email
      await update({
        email: newEmail,
      });

      toast.success(t("success"));
      onEmailChanged();
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.invalidCode"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);

    try {
      await changeEmailMutation.mutateAsync({ newEmail });

      toast.success(t("codeSent", { email: newEmail }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.emptyEmail"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (step === "verification") {
      setIsLoading(true);

      try {
        await cancelEmailMutation.mutateAsync();
      } catch {
        // Silent fail - modal will close anyway
      } finally {
        setIsLoading(false);
      }
    }

    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <Mail className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <MultiStepContainer currentStep={step} onStepChange={setStep}>
          <MultiStepContainer.Step name="email">
            <form onSubmit={handleEmailSubmit}>
              <DialogBody>
                <DialogDescription>{t("description")}</DialogDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="currentEmail">{t("currentEmail")}</FieldLabel>
                    <Input id="currentEmail" value={currentEmail} disabled className="bg-muted" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="newEmail">{t("newEmail")}</FieldLabel>
                    <Input
                      id="newEmail"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={t("newEmailPlaceholder")}
                      required
                      disabled={isLoading}
                    />
                  </Field>
                </FieldGroup>
              </DialogBody>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                  {tc("cancel")}
                </Button>
                <LoadingButton type="submit" loading={isLoading} loadingText={t("sending")}>
                  {t("sendCode")}
                </LoadingButton>
              </DialogFooter>
            </form>
          </MultiStepContainer.Step>

          <MultiStepContainer.Step name="verification">
            <form onSubmit={handleVerificationSubmit}>
              <DialogBody>
                <DialogDescription>
                  {t("verificationDescription", { email: newEmail })}
                </DialogDescription>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="verificationCode">{t("verificationCode")}</FieldLabel>
                    <VerificationCodeInput
                      id="verificationCode"
                      value={verificationCode}
                      onChange={setVerificationCode}
                      disabled={isLoading}
                    />
                    <FieldDescription>{t("codeExpires")}</FieldDescription>
                  </Field>
                </FieldGroup>
              </DialogBody>

              <DialogFooter className="flex-col">
                <div className="flex w-full gap-space-sm sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="flex-1 sm:flex-initial"
                  >
                    {tc("cancel")}
                  </Button>
                  <LoadingButton
                    type="submit"
                    loading={isLoading}
                    loadingText={t("verifying")}
                    className="flex-1 sm:flex-initial"
                  >
                    {t("verifyAndChange")}
                  </LoadingButton>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="w-full"
                >
                  {t("resendCode")}
                </Button>
              </DialogFooter>
            </form>
          </MultiStepContainer.Step>
        </MultiStepContainer>
      </DialogContent>
    </Dialog>
  );
}
