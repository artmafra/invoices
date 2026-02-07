"use client";

import { useTranslations } from "next-intl";
import {
  Section,
  SectionContent,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "@/components/ui/section";
import { Email2FACard } from "./email-2fa-card";
import { RecoveryCodesCard } from "./recovery-codes-card";
import { Totp2FACard } from "./totp-2fa-card";

interface TwoFactorSectionProps {
  isEmailVerified: boolean;
  isEmail2FAEnabled: boolean;
  isTotpEnabled: boolean;
  has2FAEnabled: boolean;
  hasBackupCodes: boolean;
  onEnableEmail2FA: () => void;
  onDisableEmail2FA: () => void;
  onEnableTotp: () => void;
  onDisableTotp: () => void;
  onRegenerateBackupCodes: () => void;
}

export function TwoFactorSection({
  isEmailVerified,
  isEmail2FAEnabled,
  isTotpEnabled,
  has2FAEnabled,
  hasBackupCodes,
  onEnableEmail2FA,
  onDisableEmail2FA,
  onEnableTotp,
  onDisableTotp,
  onRegenerateBackupCodes,
}: TwoFactorSectionProps) {
  const t = useTranslations("profile.security");

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>{t("twoFactor.title")}</SectionTitle>
        <SectionDescription>{t("twoFactor.description")}</SectionDescription>
      </SectionHeader>
      <SectionContent>
        <div className="space-y-space-lg">
          <Email2FACard
            isEnabled={isEmail2FAEnabled}
            isEmailVerified={isEmailVerified}
            onEnable={onEnableEmail2FA}
            onDisable={onDisableEmail2FA}
          />

          <Totp2FACard
            isEnabled={isTotpEnabled}
            isEmailVerified={isEmailVerified}
            onEnable={onEnableTotp}
            onDisable={onDisableTotp}
          />

          {has2FAEnabled && hasBackupCodes && (
            <RecoveryCodesCard onRegenerate={onRegenerateBackupCodes} />
          )}
        </div>
      </SectionContent>
    </Section>
  );
}
