import { Section } from "@react-email/components";
import { EmailFooter, EmailLayout, EmailText } from "@/emails/components";
import type { EmailCommonTranslations, NewLoginEmailTranslations } from "@/emails/get-translations";

interface NewLoginEmailProps {
  /** User's name for personalization */
  userName?: string;
  /** Device type (e.g., "Desktop", "Mobile", "Tablet") */
  deviceType?: string;
  /** Browser name (e.g., "Chrome", "Firefox", "Safari") */
  browser?: string;
  /** Operating system (e.g., "Windows 11", "macOS", "iOS") */
  operatingSystem?: string;
  /** IP address of the login */
  ipAddress?: string;
  /** Location derived from IP (e.g., "New York, US") - optional */
  location?: string;
  /** Timestamp of the login */
  loginTime: string;
  /** Website/app name for branding */
  websiteName?: string;
  t: NewLoginEmailTranslations;
  tCommon: EmailCommonTranslations;
}

/**
 * Email template for notifying users of new login activity.
 * Sent when a new session is created to alert users of account access.
 */
export function NewLoginEmail({
  userName,
  deviceType,
  browser,
  operatingSystem,
  ipAddress,
  location,
  loginTime,
  websiteName,
  t,
  tCommon,
}: NewLoginEmailProps) {
  const greeting = userName ? t.greeting.replace("{name}", userName) : tCommon.hello;

  return (
    <EmailLayout preview={t.preview} websiteName={websiteName}>
      <EmailText>{greeting}</EmailText>

      <EmailText>{t.body}</EmailText>

      <Section>
        <DetailRow label={t.time} value={loginTime} />
        {deviceType && <DetailRow label={t.device} value={deviceType} />}
        {browser && <DetailRow label={t.browser} value={browser} />}
        {operatingSystem && <DetailRow label={t.operatingSystem} value={operatingSystem} />}
        {ipAddress && <DetailRow label={t.ipAddress} value={ipAddress} />}
        {location && <DetailRow label={t.location} value={location} />}
      </Section>

      <EmailText>{t.warning}</EmailText>

      <EmailFooter websiteName={websiteName} helpCenterText={tCommon.helpCenter} />
    </EmailLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <EmailText className="my-space-xs">
      <strong>{label}:</strong> {value}
    </EmailText>
  );
}

export default NewLoginEmail;
