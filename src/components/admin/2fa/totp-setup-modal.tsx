"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Check, Copy, Download, Key, Shield } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useEnable2FATotp, useSetup2FATotp } from "@/hooks/public/use-2fa";
import { useDateFormat } from "@/hooks/use-date-format";
import { ErrorAlert } from "@/components/shared/error-alert";
import { LoadingButton } from "@/components/shared/loading-button";
import { LoadingState } from "@/components/shared/loading-state";
import { VerificationCodeInput } from "@/components/shared/verification-code-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { MultiStepContainer } from "@/components/ui/multi-step-container";

interface Totp2FASetupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

type SetupStep = "setup" | "backup-codes";

export function Totp2FASetupModal({ open, onOpenChange, onSuccess }: Totp2FASetupModalProps) {
  const [step, setStep] = useState<SetupStep>("setup");
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const { formatDateTime } = useDateFormat();
  const setupMutation = useSetup2FATotp();
  const enableMutation = useEnable2FATotp();
  const t = useTranslations("profile.totp2FA");
  const tc = useTranslations("common");
  const setupInitiatedRef = useRef(false);

  // Auto-setup TOTP when modal opens
  useEffect(() => {
    if (open) {
      if (!setupData && !setupMutation.isPending && !setupInitiatedRef.current) {
        setupInitiatedRef.current = true;
        setupMutation
          .mutateAsync()
          .then((data) => {
            setSetupData(data);
            setError("");
          })
          .catch((err) => setError(err instanceof Error ? err.message : t("errors.setupFailed")));
      }
    } else {
      setupInitiatedRef.current = false;
    }
  }, [open, setupData, setupMutation, t]);

  const handleVerifyCode = async () => {
    if (!verificationCode || !setupData) return;

    setError("");

    try {
      const result = await enableMutation.mutateAsync({
        secret: setupData.secret,
        code: verificationCode,
        backupCodes: setupData.backupCodes,
      });

      // Store backup codes and transition to backup codes step
      setBackupCodes(result.backupCodes);
      setStep("backup-codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.invalidCode"));
    }
  };

  const handleCopy = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems((prev) => new Set([...prev, item]));
      setTimeout(() => {
        setCopiedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(item);
          return newSet;
        });
      }, 2000);
    } catch {
      // Silent fail - user will try again if needed
    }
  };

  const handleCopyAllCodes = async () => {
    const codesText = backupCodes.join("\n");
    await handleCopy(codesText, "all-codes");
    toast.success(t("codesCopied"));
  };

  const handleDownloadCodes = () => {
    const codesText = [
      t("backupFileTitle"),
      "============================================",
      "",
      t("backupFileDescription"),
      "",
      t("backupFileKeepSafe"),
      "",
      ...backupCodes.map((code, i) => `${i + 1}. ${code}`),
      "",
      t("backupFileGenerated", { date: formatDateTime(new Date()) }),
    ].join("\n");

    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup-codes.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("codesDownloaded"));
  };

  const handleFinish = () => {
    onOpenChange(false);
    onSuccess?.();
    toast.success(t("success"));
    resetState();
  };

  const resetState = () => {
    setStep("setup");
    setSetupData(null);
    setBackupCodes([]);
    setVerificationCode("");
    setError("");
    setCopiedItems(new Set());
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  // Dynamic header based on step
  const stepConfig = {
    setup: { icon: Shield, title: t("title") },
    "backup-codes": { icon: Key, title: t("backupCodesTitle") },
  };

  const { icon: StepIcon, title: stepTitle } = stepConfig[step];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <StepIcon className="h-5 w-5" />
            {stepTitle}
          </DialogTitle>
        </DialogHeader>

        <MultiStepContainer currentStep={step} onStepChange={setStep}>
          {/* Setup Step */}
          <MultiStepContainer.Step name="setup">
            {setupMutation.isPending && !setupData && (
              <DialogBody>
                <LoadingState message={t("loading")} />
              </DialogBody>
            )}

            {error && !setupData && (
              <>
                <DialogBody>
                  <ErrorAlert message={error} />
                </DialogBody>
                <DialogFooter>
                  <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                    {tc("buttons.close")}
                  </Button>
                </DialogFooter>
              </>
            )}

            {setupData && (
              <>
                <DialogBody>
                  <DialogDescription>{t("description")}</DialogDescription>

                  <p className="text-sm text-muted-foreground">{t("scanQrCode")}</p>

                  <div className="mx-auto w-fit rounded-lg p-space-sm">
                    <Image
                      src={setupData.qrCodeUrl}
                      alt="TOTP QR Code"
                      width={192}
                      height={192}
                      className="dark:invert"
                    />
                  </div>

                  <details className="text-left">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      {t("cantScan")}
                    </summary>
                    <div className="mt-space-md">
                      <Field>
                        <FieldLabel htmlFor="manual-key">{t("manualEntryLabel")}</FieldLabel>
                        <div className="flex gap-space-sm">
                          <Input
                            id="manual-key"
                            value={setupData.manualEntryKey}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            onClick={() => handleCopy(setupData.manualEntryKey, "manual-key")}
                          >
                            {copiedItems.has("manual-key") ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </Field>
                    </div>
                  </details>

                  <Field>
                    <FieldLabel htmlFor="verification-code">{t("enterCode")}</FieldLabel>
                    <VerificationCodeInput
                      id="verification-code"
                      value={verificationCode}
                      onChange={setVerificationCode}
                    />
                  </Field>

                  {error && <ErrorAlert message={error} />}
                </DialogBody>

                <DialogFooter>
                  <Button variant="outline" onClick={handleClose}>
                    {tc("buttons.cancel")}
                  </Button>
                  <LoadingButton
                    onClick={handleVerifyCode}
                    disabled={verificationCode.length !== 6}
                    loading={enableMutation.isPending}
                    loadingText={t("verifying")}
                  >
                    {tc("buttons.verify")}
                  </LoadingButton>
                </DialogFooter>
              </>
            )}
          </MultiStepContainer.Step>

          {/* Backup Codes Step */}
          <MultiStepContainer.Step name="backup-codes">
            <DialogBody>
              <DialogDescription>{t("backupCodesDescription")}</DialogDescription>

              {/* Backup codes grid */}
              <div className="grid grid-cols-2 gap-space-sm rounded-lg border bg-muted/50 p-card">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="rounded border bg-background py-input-y px-input-x text-center font-mono text-sm"
                  >
                    {code}
                  </div>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-space-sm">
                <Button variant="outline" onClick={handleCopyAllCodes} className="flex-1" size="sm">
                  {copiedItems.has("all-codes") ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {t("copyAll")}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadCodes}
                  className="flex-1"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                  {tc("buttons.download")}
                </Button>
              </div>

              {/* Warning */}
              <Alert variant="warning">
                <AlertTitle>{tc("labels.important")}</AlertTitle>
                <AlertDescription>{t("backupWarning")}</AlertDescription>
              </Alert>
            </DialogBody>

            <DialogFooter>
              <Button onClick={handleFinish} className="w-full sm:w-auto">
                {tc("buttons.done")}
              </Button>
            </DialogFooter>
          </MultiStepContainer.Step>
        </MultiStepContainer>
      </DialogContent>
    </Dialog>
  );
}
