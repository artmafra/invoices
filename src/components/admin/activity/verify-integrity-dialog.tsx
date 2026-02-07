"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { QUICK_VERIFY_LIMITS } from "@/lib/activity/constants";
import {
  verifyActivitySchema,
  type VerifyActivityRequest,
} from "@/validations/activity.validations";
import type { ChainVerificationResult } from "@/hooks/admin/use-activity";
import { useActivityActions } from "@/hooks/admin/use-activity-actions";
import type { ActivityPermissions } from "@/hooks/admin/use-resource-permissions";
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
import { FieldDescription } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MultiStepContainer } from "@/components/ui/multi-step-container";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VerifyIntegrityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: ActivityPermissions & { currentUserId: string | undefined; isLoading: boolean };
}

type VerifyStep = "form" | "loading" | "result" | "error";

/**
 * Verify Integrity Dialog Component
 */
export function VerifyIntegrityDialog({
  open,
  onOpenChange,
  permissions,
}: VerifyIntegrityDialogProps) {
  const t = useTranslations("system.activity.verify");
  const tc = useTranslations("common.buttons");
  const [result, setResult] = useState<ChainVerificationResult | null>(null);
  const [currentStep, setCurrentStep] = useState<VerifyStep>("form");

  const { handleVerifyChain } = useActivityActions({
    permissions,
    onVerifySuccess: (res) => {
      setResult(res);
      setCurrentStep("result");
    },
  });

  const form = useForm<VerifyActivityRequest>({
    resolver: zodResolver(verifyActivitySchema) as any,
    defaultValues: {
      mode: "quick",
      limit: 100,
    },
  });

  const mode = form.watch("mode");

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        mode: "quick",
        limit: 100,
      });
      setResult(null);
      setCurrentStep("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleVerify = async (data: VerifyActivityRequest) => {
    setCurrentStep("loading");
    setResult(null);
    try {
      const params =
        data.mode === "quick" ? { mode: data.mode, limit: data.limit } : { mode: data.mode };
      await handleVerifyChain(params);
    } catch {
      setCurrentStep("error");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <ShieldCheck className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <MultiStepContainer currentStep={currentStep} onStepChange={setCurrentStep}>
          {/* Form */}
          <MultiStepContainer.Step name="form">
            <DialogBody>
              <DialogDescription>{t("description")}</DialogDescription>
              <Form {...form}>
                <form
                  id="verify-activity-form"
                  onSubmit={form.handleSubmit(handleVerify)}
                  className="space-y-space-lg"
                  noValidate
                >
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("mode")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="quick">{t("quickCheck")}</SelectItem>
                            <SelectItem value="full">{t("fullChain")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FieldDescription>
                          {mode === "quick" ? t("quickDescription") : t("fullDescription")}
                        </FieldDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {mode === "quick" && (
                    <FormField
                      control={form.control}
                      name="limit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("entriesToCheck")}</FormLabel>
                          <Select
                            onValueChange={(v) => field.onChange(parseInt(v))}
                            defaultValue={field.value?.toString()}
                            value={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {QUICK_VERIFY_LIMITS.map((limit) => (
                                <SelectItem key={limit} value={limit.toString()}>
                                  {t("lastEntries", { count: limit })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </form>
              </Form>
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {tc("cancel")}
              </Button>
              <Button type="submit" form="verify-activity-form">
                {t("startVerification")}
              </Button>
            </DialogFooter>
          </MultiStepContainer.Step>

          {/* Loading state */}
          <MultiStepContainer.Step name="loading">
            <DialogBody>
              <div className="flex flex-col items-center justify-center py-section gap-space-md">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {mode === "full" ? t("verifyingFull") : t("verifyingQuick")}
                </p>
              </div>
            </DialogBody>
          </MultiStepContainer.Step>

          {/* Result display */}
          <MultiStepContainer.Step name="result">
            <DialogBody>
              {result?.valid ? (
                <div className="flex flex-col items-center gap-space-md text-center">
                  <div className="rounded-full bg-success/20 p-space-md">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-success mb-space-sm">{t("success")}</p>
                    <p className="text-sm text-muted-foreground mt-space-xs">
                      {t("checked", {
                        checked: result.checkedEntries,
                        total: result.totalEntries,
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.mode === "full" ? t("fullChain") : t("quickCheck")}
                    </p>
                  </div>
                </div>
              ) : result ? (
                <div className="flex flex-col items-center gap-space-md text-center">
                  <div className="rounded-full bg-destructive/20 p-space-md">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-destructive mb-space-sm">{t("tampering")}</p>
                    <p className="text-sm text-muted-foreground mt-space-xs">
                      {t("brokenAt", { number: result.brokenAt?.sequenceNumber ?? 0 })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result.brokenAt?.reason === "chain_break"
                        ? t("chainBreak")
                        : result.brokenAt?.reason === "content_modified"
                          ? t("contentModified")
                          : t("invalidSignature")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t("checked", {
                        checked: result.checkedEntries,
                        total: result.totalEntries,
                      })}
                    </p>
                  </div>
                </div>
              ) : null}
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {tc("close")}
              </Button>
            </DialogFooter>
          </MultiStepContainer.Step>

          {/* Error display */}
          <MultiStepContainer.Step name="error">
            <DialogBody>
              <div className="py-space-lg">
                <div className="flex flex-col items-center gap-space-md text-center">
                  <div className="rounded-full bg-destructive/10 p-space-md">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                  </div>
                  <div>
                    <p className="font-medium text-destructive">{t("verificationFailed")}</p>
                    <p className="text-sm text-muted-foreground mt-space-xs">{t("errorOccurred")}</p>
                  </div>
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {tc("close")}
              </Button>
            </DialogFooter>
          </MultiStepContainer.Step>
        </MultiStepContainer>
      </DialogContent>
    </Dialog>
  );
}
