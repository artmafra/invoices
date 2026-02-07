import { Section } from "@react-email/components";
import { EmailButton, EmailFooter, EmailLayout, EmailText } from "@/emails/components";
import type {
  EmailCommonTranslations,
  PasswordResetEmailTranslations,
} from "@/emails/get-translations";

interface PasswordResetEmailProps {
  resetUrl: string;
  expiresInMinutes?: number;
  websiteName?: string;
  t: PasswordResetEmailTranslations;
  tCommon: EmailCommonTranslations;
}

/**
 * Email template for password reset requests.
 */
export function PasswordResetEmail({
  resetUrl,
  expiresInMinutes = 60,
  websiteName,
  t,
  tCommon,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview={t.preview} websiteName={websiteName}>
      <EmailText>{t.body}</EmailText>

      <Section className="my-section">
        <EmailButton href={resetUrl}>{t.button}</EmailButton>
      </Section>

      <EmailText muted>{t.expiry.replace("{minutes}", String(expiresInMinutes))}</EmailText>

      <EmailText muted>{t.footer}</EmailText>

      <EmailFooter websiteName={websiteName} helpCenterText={tCommon.helpCenter} />
    </EmailLayout>
  );
}

export default PasswordResetEmail;
