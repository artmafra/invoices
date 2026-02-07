"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { siteConfig } from "@/config/site.config";
import { useResetPassword, useValidateResetToken } from "@/hooks/public/use-auth";
import { usePasswordValidation } from "@/hooks/public/use-password-policy";
import { ErrorAlert } from "@/components/shared/error-alert";
import { LoadingButton } from "@/components/shared/loading-button";
import { PasswordStrengthIndicator } from "@/components/shared/password-strength-indicator";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiStepContainer } from "@/components/ui/multi-step-container";

type ResetStep = "loading" | "invalid" | "form" | "success";

function ResetPasswordContent() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { data: tokenValidation, isLoading: isValidating } = useValidateResetToken(token);
  const resetPasswordMutation = useResetPassword();
  const passwordValidation = usePasswordValidation(password);

  // Derive step from validation state (no useEffect needed)
  const currentStep: ResetStep = useMemo(() => {
    if (!token) {
      return "invalid";
    } else if (isValidating) {
      return "loading";
    } else if (!tokenValidation?.valid) {
      return "invalid";
    } else {
      return "form";
    }
  }, [isValidating, token, tokenValidation]);

  // Track success state separately since it's user-triggered
  const [showSuccess, setShowSuccess] = useState(false);
  const effectiveStep = showSuccess ? "success" : currentStep;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t("resetPassword.passwordsDoNotMatch"));
      return;
    }

    // Use password policy validation
    if (passwordValidation && !passwordValidation.valid) {
      toast.error(passwordValidation.errors[0] || t("resetPassword.passwordRequirements"));
      return;
    }

    if (!token) return;

    resetPasswordMutation.mutate(
      { token, password },
      {
        onSuccess: () => {
          setShowSuccess(true);
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push("/admin/login");
          }, 3000);
        },
      },
    );
  };

  return (
    <MultiStepContainer currentStep={effectiveStep}>
      {/* Loading state */}
      <MultiStepContainer.Step name="loading">
        <div className="p-section md:p-section">
          <div className="flex flex-col items-center justify-center gap-space-lg">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">{t("resetPassword.validating")}</p>
          </div>
        </div>
      </MultiStepContainer.Step>

      {/* Invalid token state */}
      <MultiStepContainer.Step name="invalid">
        <div className="p-section md:p-section">
          <div className="flex flex-col gap-space-xl">
            <div className="flex items-center gap-space-sm mb-space-xs justify-center">
              <Image src="/images/logo.svg" alt={siteConfig.name} width={28} height={28} />
              <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
            </div>
            <ErrorAlert message={tokenValidation?.error || t("resetPassword.invalidLink")} />
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-space-xs text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        </div>
      </MultiStepContainer.Step>

      {/* Reset form */}
      <MultiStepContainer.Step name="form">
        <form className="p-section md:p-section" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-space-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-space-sm mb-space-xs">
                <Image src="/images/logo.svg" alt={siteConfig.name} width={28} height={28} />
                <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
              </div>
              <p className="text-muted-foreground text-balance">
                {t("resetPassword.enterNewPassword", { email: tokenValidation?.email ?? "" })}
              </p>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">{t("resetPassword.newPassword")}</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordStrengthIndicator validation={passwordValidation} />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">
                  {t("resetPassword.confirmPassword")}
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </Field>
              <LoadingButton
                type="submit"
                className="w-full"
                loading={resetPasswordMutation.isPending}
                loadingText={t("resetPassword.resetting")}
              >
                {t("resetPassword.resetButton")}
              </LoadingButton>
            </FieldGroup>

            <div className="text-center text-sm">
              <Link
                href="/admin/login"
                className="inline-flex items-center gap-space-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("forgotPassword.backToLogin")}
              </Link>
            </div>
          </div>
        </form>
      </MultiStepContainer.Step>

      {/* Success state */}
      <MultiStepContainer.Step name="success">
        <div className="p-section md:p-section">
          <div className="flex flex-col items-center text-center gap-space-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-space-sm mb-space-xs">
                <Image src="/images/logo.svg" alt={siteConfig.name} width={28} height={28} />
                <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
              </div>
              <p className="text-muted-foreground text-balance mt-space-sm">
                {t("resetPassword.success.description")}
              </p>
            </div>

            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-space-xs text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("resetPassword.success.goToLogin")}
            </Link>
          </div>
        </div>
      </MultiStepContainer.Step>
    </MultiStepContainer>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-card relative">
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm md:max-w-md">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0">
            <Suspense
              fallback={
                <div className="p-section md:p-section">
                  <div className="flex flex-col items-center justify-center gap-space-lg">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading...</p>
                  </div>
                </div>
              }
            >
              <ResetPasswordContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
