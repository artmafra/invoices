import { Section } from "@react-email/components";
import { EmailButton, EmailFooter, EmailLayout, EmailText } from "@/emails/components";
import type { EmailCommonTranslations, InviteEmailTranslations } from "@/emails/get-translations";

interface InviteEmailProps {
  inviteUrl: string;
  inviterName?: string;
  roleName?: string;
  expiresInDays?: number;
  websiteName?: string;
  t: InviteEmailTranslations;
  tCommon: EmailCommonTranslations;
}

/**
 * Invitation email template for inviting new users.
 */
export function InviteEmail({
  inviteUrl,
  inviterName,
  roleName,
  expiresInDays = 7,
  websiteName,
  t,
  tCommon,
}: InviteEmailProps) {
  const siteName = websiteName || "our platform";

  // Build invitation text
  let inviteText = inviterName
    ? t.bodyWithInviter.replace("{inviterName}", inviterName).replace("{siteName}", siteName)
    : t.body.replace("{siteName}", siteName);

  if (roleName) {
    inviteText += " " + t.roleDescription.replace("{roleName}", roleName);
  }

  // Handle plural for expiry days
  const expiryText = t.expiryDays
    .replace(
      "{count, plural, one {# day} other {# days}}",
      `${expiresInDays} ${expiresInDays === 1 ? "day" : "days"}`,
    )
    .replace("{count}", String(expiresInDays));

  return (
    <EmailLayout preview={t.preview.replace("{siteName}", siteName)} websiteName={websiteName}>
      <EmailText>{inviteText}.</EmailText>

      <EmailText>{t.instructions}</EmailText>

      <Section className="my-section">
        <EmailButton href={inviteUrl}>{t.button}</EmailButton>
      </Section>

      <EmailText muted>{expiryText}</EmailText>

      <EmailText muted>{t.footer}</EmailText>

      <EmailFooter websiteName={websiteName} helpCenterText={tCommon.helpCenter} />
    </EmailLayout>
  );
}

export default InviteEmail;
