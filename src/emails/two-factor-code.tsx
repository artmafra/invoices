import { EmailFooter, EmailLayout, EmailText, VerificationCode } from "@/emails/components";
import type {
  EmailCommonTranslations,
  TwoFactorCodeEmailTranslations,
} from "@/emails/get-translations";

interface TwoFactorCodeEmailProps {
  code: string;
  websiteName?: string;
  t: TwoFactorCodeEmailTranslations;
  tCommon: EmailCommonTranslations;
}

/**
 * Email template for two-factor authentication codes.
 */
export function TwoFactorCodeEmail({ code, websiteName, t, tCommon }: TwoFactorCodeEmailProps) {
  return (
    <EmailLayout preview={t.preview.replace("{code}", code)} websiteName={websiteName}>
      <EmailText>{t.body}</EmailText>

      <VerificationCode code={code} />

      <EmailText muted>{t.expiry}</EmailText>

      <EmailText muted>{t.footer}</EmailText>

      <EmailFooter websiteName={websiteName} helpCenterText={tCommon.helpCenter} />
    </EmailLayout>
  );
}

export default TwoFactorCodeEmail;
