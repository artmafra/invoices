"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEnable2FAEmail, useSetup2FAEmail } from "@/hooks/public/use-2fa";
import { ErrorAlert } from "@/components/shared/error-alert";
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
import { Field, FieldLabel } from "@/components/ui/field";

interface Email2FASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  onEnabled: () => void;
}

export function Email2FASetupModal({
  isOpen,
  onClose,
  userEmail,
  onEnabled,
}: Email2FASetupModalProps) {
  const setupMutation = useSetup2FAEmail();
  const enableMutation = useEnable2FAEmail();
  const t = useTranslations("profile.email2FA");
  const tc = useTranslations("common.buttons");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async () => {
    setError("");
    try {
      await setupMutation.mutateAsync();
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.sendFailed"));
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) return;

    setError("");

    try {
      await enableMutation.mutateAsync(code.trim());
      onEnabled();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.verifyFailed"));
    }
  };

  const resetState = () => {
    setCode("");
    setError("");
    setCodeSent(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <Shield className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <DialogDescription>{t("description")}</DialogDescription>

          <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {codeSent ? (
                <>
                  {t("codeSentTo", { email: "" })}
                  <span className="font-medium">{userEmail}</span>
                </>
              ) : (
                <>
                  {t("sendCodeTo", { email: "" })}
                  <span className="font-medium">{userEmail}</span>
                </>
              )}
            </p>
            <LoadingButton
              variant="outline"
              size="sm"
              onClick={handleSendCode}
              loading={setupMutation.isPending}
              loadingText={t("sending")}
              className="w-full sm:w-auto"
            >
              {codeSent ? t("resend") : t("sendCode")}
            </LoadingButton>
          </div>

          {error && <ErrorAlert message={error} />}

          <Field>
            <FieldLabel htmlFor="code">{t("enterCode")}</FieldLabel>
            <VerificationCodeInput id="code" value={code} onChange={setCode} disabled={!codeSent} />
          </Field>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {tc("cancel")}
          </Button>
          <LoadingButton
            onClick={handleVerifyCode}
            disabled={code.length !== 6 || !codeSent}
            loading={enableMutation.isPending}
            loadingText={t("verifying")}
          >
            {t("verifyButton")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
