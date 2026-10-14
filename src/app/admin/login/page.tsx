"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Fingerprint } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { siteConfig } from "@/config/site.config";
import { signInWithCredentials, signInWithGoogle, signInWithPasskey } from "@/lib/auth-client";
import { useForgotPassword } from "@/hooks/public/use-auth";
import { useAuthenticateWithPasskey } from "@/hooks/public/use-passkey";
import { TwoFactorMethodSelection } from "@/components/public/two-factor-method-selection";
import { ErrorAlert } from "@/components/shared/error-alert";
import { LoadingButton } from "@/components/shared/loading-button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MultiStepContainer } from "@/components/ui/multi-step-container";

// View states for the login card
type LoginView = "login" | "forgot-password" | "forgot-password-sent" | "two-factor";

// Error codes (OAuth callback / proxy redirects) shown as "access denied"
const ACCESS_DENIED_ERRORS = new Set([
  "AccessDenied",
  "account_not_linked",
  "signup_disabled",
  "google_not_linked",
  "user_not_found",
  "account_deactivated",
  "email_mismatch",
]);

export default function AdminLoginPage() {
  const t = useTranslations("auth");
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const viewParam = searchParams.get("view");
  const emailParam = searchParams.get("email");

  // View state - check URL param for initial view
  const [currentView, setCurrentView] = useState<LoginView>(() => {
    if (viewParam === "forgot-password") return "forgot-password";
    return "login";
  });

  // Form state
  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [availableMethods, setAvailableMethods] = useState<{
    email: boolean;
    totp: boolean;
    backup: boolean;
    preferred?: string;
  } | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");

  // Hooks
  const forgotPasswordMutation = useForgotPassword();
  const authenticateWithPasskeyMutation = useAuthenticateWithPasskey();

  // Check if Google provider is configured via env var
  const hasGoogleProvider = !!process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID;

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signInWithCredentials(email, password);

      if (result.status === "two-factor") {
        // Show 2FA form
        setTwoFactorToken(result.token);
        setUserId(result.userId);
        setUserEmail(result.email);
        setAvailableMethods(result.availableMethods);
        setCurrentView("two-factor");
      } else if (result.status === "success") {
        // Hard navigation so SSR re-runs with the new session
        // This applies the user's locale/theme preferences immediately
        window.location.href = "/admin";
      } else if (result.status === "invalid") {
        toast.error(t("login.errors.invalidCredentials"));
      } else {
        toast.error(t("login.errors.authFailed"));
      }
    } catch {
      toast.error(t("login.errors.authFailed"));
    }

    setIsLoading(false);
  };

  const handleGoogleSignIn = () => {
    void signInWithGoogle();
  };

  const handlePasskeySignIn = async () => {
    try {
      // Authenticate with passkey - this verifies the passkey and returns userId + token
      const { userId, passkeyVerificationToken } =
        await authenticateWithPasskeyMutation.mutateAsync(undefined);

      const ok = await signInWithPasskey({ userId, verificationToken: passkeyVerificationToken });

      if (ok) {
        // Hard navigation so SSR re-runs with the new session
        // This applies the user's locale/theme preferences immediately
        window.location.href = "/admin";
      } else {
        toast.error(t("login.errors.authFailed"));
      }
    } catch {
      // Error is handled by the mutation hook (shows toast)
      // Silent fail for user-cancelled passkey prompts
    }
  };

  const handleBackToLogin = () => {
    setCurrentView("login");
    setTwoFactorToken("");
    setUserId("");
    setUserEmail("");
    setAvailableMethods(null);
    setForgotEmail("");
  };

  const handleForgotPassword = () => {
    setForgotEmail(email); // Pre-fill with login email if available
    setCurrentView("forgot-password");
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    forgotPasswordMutation.mutate(
      { email: forgotEmail },
      {
        onSuccess: () => {
          setCurrentView("forgot-password-sent");
        },
      },
    );
  };

  const handleTryAgain = () => {
    setCurrentView("forgot-password");
  };

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-card relative">
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm md:max-w-md">
        <Card className="overflow-hidden p-0">
          <CardContent className="grid p-0 md:px-0">
            <MultiStepContainer currentStep={currentView} onStepChange={setCurrentView}>
              {/* Login Form */}
              <MultiStepContainer.Step name="login">
                <form className="p-section md:p-section" onSubmit={handleCredentialsSignIn}>
                  <div className="flex flex-col gap-space-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex items-center gap-space-sm mb-space-xs">
                        <Image
                          src="/images/mafra-logo.svg"
                          alt={siteConfig.name}
                          width={28}
                          height={28}
                        />
                        <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
                      </div>
                      <p className="text-muted-foreground">{t("login.subtitle")}</p>
                    </div>

                    {error && ACCESS_DENIED_ERRORS.has(error) && (
                      <ErrorAlert message={t("login.errors.accessDenied")} />
                    )}

                    {(error === "CredentialsSignin" || error === "invalid_credentials") && (
                      <ErrorAlert message={t("login.errors.invalidCredentials")} />
                    )}

                    <FieldGroup className="gap-space-lg">
                      {hasGoogleProvider && (
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full"
                          onClick={handleGoogleSignIn}
                        >
                          <Image
                            src="/images/brands/google-color.svg"
                            alt="Google"
                            width={16}
                            height={16}
                          />
                          <span>{t("login.loginWithGoogle")}</span>
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        type="button"
                        className="w-full"
                        onClick={handlePasskeySignIn}
                        disabled={authenticateWithPasskeyMutation.isPending}
                      >
                        <Fingerprint className="h-4 w-4" />
                        <span>
                          {authenticateWithPasskeyMutation.isPending
                            ? t("login.authenticating")
                            : t("login.loginWithPasskey")}
                        </span>
                      </Button>

                      <div className="relative flex items-center">
                        <div className="grow border-t border-border"></div>
                        <span className="mx-space-md shrink text-sm text-muted-foreground">
                          {t("login.orContinueWith")}
                        </span>
                        <div className="grow border-t border-border"></div>
                      </div>

                      <Field>
                        <FieldLabel htmlFor="email">{t("login.email")}</FieldLabel>
                        <Input
                          id="email"
                          type="email"
                          placeholder=""
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </Field>
                      <Field>
                        <div className="flex items-center justify-between">
                          <FieldLabel htmlFor="password">{t("login.password")}</FieldLabel>
                          <button
                            type="button"
                            onClick={handleForgotPassword}
                            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                          >
                            {t("login.forgotPassword")}
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            className="pr-[calc(var(--spacing-input-x)+2rem)]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
                            onClick={() => setShowPassword((visible) => !visible)}
                            aria-label={
                              showPassword ? t("login.hidePassword") : t("login.showPassword")
                            }
                            aria-pressed={showPassword}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </Field>
                      <LoadingButton
                        type="submit"
                        className="w-full mt-space-sm"
                        loading={isLoading}
                        loadingText={t("login.signingIn")}
                      >
                        {t("login.signIn")}
                      </LoadingButton>
                    </FieldGroup>
                  </div>
                </form>
              </MultiStepContainer.Step>

              {/* Forgot Password Form */}
              <MultiStepContainer.Step name="forgot-password">
                <form className="p-section md:p-section" onSubmit={handleForgotPasswordSubmit}>
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
                      <p className="text-muted-foreground">{t("forgotPassword.subtitle")}</p>
                    </div>

                    <FieldGroup>
                      <Field>
                        <FieldLabel htmlFor="forgot-email">{t("login.email")}</FieldLabel>
                        <Input
                          id="forgot-email"
                          type="email"
                          placeholder=""
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          required
                        />
                      </Field>
                      <LoadingButton
                        type="submit"
                        className="w-full"
                        loading={forgotPasswordMutation.isPending}
                        loadingText={t("forgotPassword.sending")}
                      >
                        {t("forgotPassword.sendLink")}
                      </LoadingButton>
                    </FieldGroup>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleBackToLogin}
                        className="inline-flex items-center gap-space-xs text-sm text-muted-foreground underline-offset-4 hover:underline"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        {t("forgotPassword.backToLogin")}
                      </button>
                    </div>
                  </div>
                </form>
              </MultiStepContainer.Step>

              {/* Forgot Password Success */}
              <MultiStepContainer.Step name="forgot-password-sent">
                <div className="p-section md:p-section">
                  <div className="flex flex-col items-center text-center gap-space-xl">
                    <div className="flex flex-col items-center text-center">
                      <div className="flex items-center gap-space-sm">
                        <Image
                          src="/images/logo.svg"
                          alt={siteConfig.name}
                          width={28}
                          height={28}
                        />
                        <h1 className="text-2xl font-bold italic">{siteConfig.name}</h1>
                      </div>
                      <p className="text-muted-foreground mt-card">
                        {t("forgotPassword.success.description", { email: forgotEmail })}
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {t("forgotPassword.success.noEmail")}{" "}
                      <button
                        type="button"
                        onClick={handleTryAgain}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {t("forgotPassword.success.tryAgain")}
                      </button>
                    </p>
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="inline-flex items-center gap-space-xs text-sm text-muted-foreground underline-offset-4 hover:underline"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {t("forgotPassword.backToLogin")}
                    </button>
                  </div>
                </div>
              </MultiStepContainer.Step>

              {/* 2FA Method Selection */}
              <MultiStepContainer.Step name="two-factor">
                <div className="p-section md:p-section">
                  {availableMethods && (
                    <TwoFactorMethodSelection
                      token={twoFactorToken}
                      userId={userId}
                      email={userEmail}
                      availableMethods={availableMethods}
                      onBack={handleBackToLogin}
                    />
                  )}
                </div>
              </MultiStepContainer.Step>
            </MultiStepContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
