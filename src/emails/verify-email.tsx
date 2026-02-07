import { EmailFooter, EmailLayout, EmailText, VerificationCode } from "@/emails/components";
import type {
  EmailChangeEmailTranslations,
  EmailCommonTranslations,
} from "@/emails/get-translations";

interface VerifyEmailProps {
  code: string;
  email: string;
  websiteName?: string;
  t: EmailChangeEmailTranslations;
  tCommon: EmailCommonTranslations;
}

/**
 * Email template for email verification (both email changes and new email additions).
 */
export function VerifyEmailEmail({ code, email, websiteName, t, tCommon }: VerifyEmailProps) {
  return (
    <EmailLayout preview={t.preview.replace("{email}", email)} websiteName={websiteName}>
      <EmailText>
        {t.body.split("{email}")[0]}
        <strong>{email}</strong>
        {t.body.split("{email}")[1]}
      </EmailText>

      <EmailText>{t.codeLabel}</EmailText>

      <VerificationCode code={code} />

      <EmailText muted>{t.expiry}</EmailText>

      <EmailText muted>{t.footer}</EmailText>

      <EmailFooter websiteName={websiteName} helpCenterText={tCommon.helpCenter} />
    </EmailLayout>
  );
}

// Backward compatibility alias
export const EmailChangeVerificationEmail = VerifyEmailEmail;

export default VerifyEmailEmail;
