"use client";

import { useTranslations } from "next-intl";
import {
  Section,
  SectionContent,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "@/components/ui/section";
import { EmailMethodCard } from "./email-method-card";
import { GoogleMethodCard } from "./google-method-card";
import { PasskeyMethodCard } from "./passkey-method-card";
import { PasswordMethodCard } from "./password-method-card";

interface SignInMethodsSectionProps {
  email: string;
  isEmailVerified: boolean;
  additionalEmailCount: number;
  hasUnverifiedEmails: boolean;
  isGoogleLinked: boolean;
  isGoogleLoading: boolean;
  passkeyCount: number;
  onManageEmails: () => void;
  onChangePassword: () => void;
  onGoogleConnect: () => void;
  onGoogleDisconnect: () => void;
  onManagePasskeys: () => void;
}

export function SignInMethodsSection({
  email,
  isEmailVerified,
  additionalEmailCount,
  hasUnverifiedEmails,
  isGoogleLinked,
  isGoogleLoading,
  passkeyCount,
  onManageEmails,
  onChangePassword,
  onGoogleConnect,
  onGoogleDisconnect,
  onManagePasskeys,
}: SignInMethodsSectionProps) {
  const t = useTranslations("profile.security");

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>{t("signInMethods.title")}</SectionTitle>
        <SectionDescription>{t("signInMethods.description")}</SectionDescription>
      </SectionHeader>
      <SectionContent>
        <div className="space-y-space-lg">
          <EmailMethodCard
            email={email}
            isVerified={isEmailVerified}
            additionalEmailCount={additionalEmailCount}
            hasUnverifiedEmails={hasUnverifiedEmails}
            onManage={onManageEmails}
          />

          <PasswordMethodCard onChangePassword={onChangePassword} />

          <GoogleMethodCard
            isLinked={isGoogleLinked}
            isLoading={isGoogleLoading}
            onConnect={onGoogleConnect}
            onDisconnect={onGoogleDisconnect}
          />

          <PasskeyMethodCard passkeyCount={passkeyCount} onManage={onManagePasskeys} />
        </div>
      </SectionContent>
    </Section>
  );
}
