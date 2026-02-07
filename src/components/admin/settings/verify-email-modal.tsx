"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useSendEmailVerification, useVerifyEmail } from "@/hooks/public/use-profile";
import { LoadingButton } from "@/components/shared/loading-button";
import { LoadingState } from "@/components/shared/loading-state";
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";

interface VerifyEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onEmailVerified: () => void;
}

export function VerifyEmailModal({
  isOpen,
  onClose,
  userEmail,
  onEmailVerified,
}: VerifyEmailModalProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const t = useTranslations("profile.verifyEmail");
  const tc = useTranslations("common.buttons");
  const sendEmailVerificationMutation = useSendEmailVerification();
  const verifyEmailMutation = useVerifyEmail();

  const handleReset = () => {
    setVerificationCode("");
    setIsLoading(false);
    setCodeSent(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
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
      await verifyEmailMutation.mutateAsync(verificationCode);

      onEmailVerified();
      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);

    try {
      await sendEmailVerificationMutation.mutateAsync();
    } finally {
      setIsLoading(false);
    }
  };

  // Use effect to send code when modal opens
  useEffect(() => {
    const sendCodeOnOpen = async () => {
      if (isOpen && !codeSent && !isLoading) {
        setIsLoading(true);

        try {
          await sendEmailVerificationMutation.mutateAsync();
          setCodeSent(true);
        } finally {
          setIsLoading(false);
        }
      }
    };

    sendCodeOnOpen();
  }, [isOpen, codeSent, isLoading, sendEmailVerificationMutation]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <Mail className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {!codeSent ? (
          <DialogBody>
            <DialogDescription>{t("sendingCode")}</DialogDescription>
            <LoadingState message={t("sendingCodeLoading")} />
          </DialogBody>
        ) : (
          <form
            key="verify-form"
            className="space-y-space-lg animate-in fade-in-0 duration-200"
            onSubmit={handleVerificationSubmit}
          >
            <DialogBody>
              <DialogDescription>{t("description", { email: userEmail })}</DialogDescription>
              <Field>
                <FieldLabel htmlFor="verificationCode">{t("verificationCode")}</FieldLabel>
                <VerificationCodeInput
                  id="verificationCode"
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isLoading}
                  autoFocus
                />
                <FieldDescription>{t("codeExpires")}</FieldDescription>
              </Field>
            </DialogBody>

            <DialogFooter className="flex-col">
              <div className="flex gap-space-sm w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
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
                  {t("verifyButton")}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
