import { Section } from "@react-email/components";
import { EmailButton, EmailFooter, EmailLayout, EmailText } from "@/emails/components";
import type { EmailCommonTranslations, WelcomeEmailTranslations } from "@/emails/get-translations";

interface WelcomeEmailProps {
  name: string;
  loginUrl?: string;
  websiteName?: string;
  t: WelcomeEmailTranslations;
  tCommon: EmailCommonTranslations;
}

/**
 * Welcome email template for new user registrations.
 */
export function WelcomeEmail({ name, loginUrl, websiteName, t, tCommon }: WelcomeEmailProps) {
  const siteName = websiteName || "our platform";

  return (
    <EmailLayout
      preview={t.preview.replace("{siteName}", siteName).replace("{name}", name)}
      websiteName={websiteName}
    >
      <EmailText>{t.greeting.replace("{name}", name)}</EmailText>

      <EmailText>{t.body.replace("{siteName}", siteName)}</EmailText>

      {loginUrl && (
        <Section className="my-section">
          <EmailButton href={loginUrl}>{t.button}</EmailButton>
        </Section>
      )}

      <EmailText>{t.footer}</EmailText>

      <EmailFooter websiteName={websiteName} helpCenterText={tCommon.helpCenter} />
    </EmailLayout>
  );
}

export default WelcomeEmail;
