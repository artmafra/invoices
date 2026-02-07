"use client";

import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { siteConfig } from "@/config/site.config";
import { usePasswordValidation } from "@/hooks/public/use-password-policy";
import { useAcceptUserInvite, useValidateUserInvite } from "@/hooks/public/use-user-invite";
import { ErrorAlert } from "@/components/shared/error-alert";
import { LoadingButton } from "@/components/shared/loading-button";
import { LoadingState } from "@/components/shared/loading-state";
import { PasswordStrengthIndicator } from "@/components/shared/password-strength-indicator";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiStepContainer } from "@/components/ui/multi-step-container";

type InviteStep = "loading" | "invalid" | "form" | "success";

function InvitePageContent() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Validate token
  const { data: tokenValidation, isLoading: isValidating } = useValidateUserInvite(token);

  // Form state
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  // Password validation
  const passwordValidation = usePasswordValidation(password);

  // Mutation
  const acceptInviteMutation = useAcceptUserInvite();

  // Determine current step
  const currentStep: InviteStep = useMemo(() => {
    if (!token) return "invalid";
    if (showSuccess) return "success";
    if (isValidating) return "loading";
    if (!tokenValidation?.valid) return "invalid";
    return "form";
  }, [isValidating, token, tokenValidation, showSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (password !== confirmPassword) {
      toast.error(t("invite.passwordsDoNotMatch"));
      return;
    }

    // Validate password policy
    if (passwordValidation && !passwordValidation.valid) {
      toast.error(passwordValidation.errors[0]);
      return;
    }

    acceptInviteMutation.mutate(
      {
        token: token!,
        name,
        password,
      },
      {
        onSuccess: async () => {
          setShowSuccess(true);

          // Auto-login with credentials
          try {
            const result = await signIn("credentials", {
              email: tokenValidation!.email,
              password,
              redirect: false,
            });

            if (result?.ok) {
              // Use hard navigation to ensure SSR re-runs with new JWT session
              setTimeout(() => {
                window.location.href = "/admin";
              }, 1500);
            } else {
              // Auto-login failed, redirect to login with email pre-filled
              toast.error(t("invite.autoLoginFailed"));
              setTimeout(() => {
                router.push(`/admin/login?email=${encodeURIComponent(tokenValidation!.email!)}`);
              }, 1500);
            }
          } catch {
            // Auto-login error, redirect to login with email pre-filled
            toast.error(t("invite.autoLoginFailed"));
            setTimeout(() => {
              router.push(`/admin/login?email=${encodeURIComponent(tokenValidation!.email!)}`);
            }, 1500);
          }
        },
      },
    );
  };

  const handleBackToLogin = () => {
    router.push("/admin/login");
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-card relative">
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm md:max-w-md">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:px-0">
            <MultiStepContainer currentStep={currentStep}>
              {/* Loading - Validating Token */}
              <MultiStepContainer.Step name="loading">
                <div className="p-section md:p-section">
                  <div className="flex flex-col items-center text-center gap-space-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex items-center gap-space-sm mb-space-xs">
                        <Image
                          src="/images/logo.svg"
                          alt={siteConfig.name}
                          width={28}
                          height={28}
                        />
                        <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
                      </div>
                    </div>
                    <LoadingState message={t("invite.validating")} />
                  </div>
                </div>
              </MultiStepContainer.Step>

              {/* Invalid Token */}
              <MultiStepContainer.Step name="invalid">
                <div className="p-section md:p-section">
                  <div className="flex flex-col gap-space-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex items-center gap-space-sm mb-space-xs">
                        <Image
                          src="/images/logo.svg"
                          alt={siteConfig.name}
                          width={28}
                          height={28}
                        />
                        <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
                      </div>
                    </div>

                    <ErrorAlert message={tokenValidation?.error || t("invite.invalidLink")} />

                    <p className="text-sm text-muted-foreground text-center">
                      {t("invite.contactInviter")}
                    </p>

                    <Button onClick={handleBackToLogin} variant="outline" className="w-full">
                      {t("invite.goToLogin")}
                    </Button>
                  </div>
                </div>
              </MultiStepContainer.Step>

              {/* Registration Form */}
              <MultiStepContainer.Step name="form">
                <form className="p-section md:p-section" onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-space-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex items-center gap-space-sm mb-space-xs">
                        <Image
                          src="/images/logo.svg"
                          alt={siteConfig.name}
                          width={28}
                          height={28}
                        />
                        <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
                      </div>
                      <p className="text-muted-foreground">
                        {t("invite.completeSetup", {
                          email: (tokenValidation?.email ?? "") as string,
                        })}
                      </p>
                    </div>

                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="name">{t("invite.fullName")}</FieldLabel>
                        <Input
                          id="name"
                          type="text"
                          placeholder={t("invite.fullNamePlaceholder")}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="password">{t("invite.password")}</FieldLabel>
                        <Input
                          id="password"
                          type="password"
                          placeholder={t("invite.passwordPlaceholder")}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        {password && passwordValidation && (
                          <PasswordStrengthIndicator validation={passwordValidation} />
                        )}
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="confirmPassword">
                          {t("invite.confirmPassword")}
                        </FieldLabel>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder={t("invite.confirmPasswordPlaceholder")}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                      </Field>

                      <LoadingButton
                        type="submit"
                        className="w-full"
                        loading={acceptInviteMutation.isPending}
                        loadingText={t("invite.creatingAccount")}
                      >
                        {t("invite.createAccount")}
                      </LoadingButton>
                    </FieldGroup>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleBackToLogin}
                        className="inline-flex items-center gap-space-xs text-sm text-muted-foreground underline-offset-4 hover:underline"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t("invite.alreadyHaveAccount")} {t("invite.signIn")}
                      </button>
                    </div>
                  </div>
                </form>
              </MultiStepContainer.Step>

              {/* Success - Auto-login in Progress */}
              <MultiStepContainer.Step name="success">
                <div className="p-section md:p-section">
                  <div className="flex flex-col items-center text-center gap-space-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex items-center gap-space-sm mb-space-xs">
                        <Image
                          src="/images/logo.svg"
                          alt={siteConfig.name}
                          width={28}
                          height={28}
                        />
                        <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
                      </div>
                      <p className="text-muted-foreground mt-card">{t("invite.success")}</p>
                    </div>
                    <LoadingState message={t("invite.loggingIn")} />
                  </div>
                </div>
              </MultiStepContainer.Step>
            </MultiStepContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <InvitePageContent />
    </Suspense>
  );
}
