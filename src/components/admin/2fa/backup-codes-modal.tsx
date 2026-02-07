"use client";

import { useState } from "react";
import { Check, Copy, Download, Key } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDateFormat } from "@/hooks/use-date-format";
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

interface BackupCodesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backupCodes: string[];
  onDone?: () => void;
}

export function BackupCodesModal({
  open,
  onOpenChange,
  backupCodes,
  onDone,
}: BackupCodesModalProps) {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const { formatDateTime } = useDateFormat();
  const t = useTranslations("profile.totp2FA");
  const tc = useTranslations("common");

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

  const handleDone = () => {
    onOpenChange(false);
    onDone?.();
    setCopiedItems(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="animate-in fade-in-0 duration-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-space-sm">
              <Key className="h-5 w-5" />
              {t("backupCodesTitle")}
            </DialogTitle>
          </DialogHeader>

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
              <Button variant="outline" onClick={handleDownloadCodes} className="flex-1" size="sm">
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
            <Button onClick={handleDone} className="w-full sm:w-auto">
              {tc("buttons.done")}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
