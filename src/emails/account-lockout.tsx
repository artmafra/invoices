import { Section } from "@react-email/components";
import { EmailFooter, EmailLayout, EmailText } from "@/emails/components";
import type {
  AccountLockoutEmailTranslations,
  EmailCommonTranslations,
} from "@/emails/get-translations";

interface AccountLockoutEmailProps {
  /** User's name for personalization */
  userName?: string;
  /** Timestamp of when the lockout occurred */
  lockoutTime: string;
  /** IP address if available */
  ipAddress?: string;
  /** Device/browser info if available */
  deviceInfo?: string;
  /** Number of failed attempts that triggered the lockout */
  failedAttempts: number;
  /** How long the account will be locked */
  lockoutDuration: string;
  /** Website/app name for branding */
  websiteName?: string;
  t: AccountLockoutEmailTranslations;
  tCommon: EmailCommonTranslations;
}

/**
 * Email template for account lockout notifications.
 * Sent when an account is locked due to too many failed login attempts.
 */
export function AccountLockoutEmail({
  userName,
  lockoutTime,
  ipAddress,
  deviceInfo,
  failedAttempts,
  lockoutDuration,
  websiteName,
  t,
  tCommon,
}: AccountLockoutEmailProps) {
  const greeting = userName ? t.greeting.replace("{name}", userName) : tCommon.hello;

  return (
    <EmailLayout preview={t.preview} websiteName={websiteName}>
      <EmailText>{greeting}</EmailText>

      <EmailText>{t.body.replace("{attempts}", String(failedAttempts))}</EmailText>

      <Section>
        <DetailRow label={t.lockedAt} value={lockoutTime} />
        <DetailRow label={t.duration} value={lockoutDuration} />
        <DetailRow label={t.failedAttempts} value={failedAttempts} />
        {deviceInfo && <DetailRow label="Device" value={deviceInfo} />}
        {ipAddress && <DetailRow label="IP" value={ipAddress} />}
      </Section>

      <EmailText>
        <strong>{t.whatToDo.split("?")[0]}?</strong>{" "}
        {t.whatToDo.split("?")[1]?.trim() || t.whatToDo}
      </EmailText>

      <EmailText>
        <strong>{t.notYou.split("?")[0]}?</strong> {t.notYou.split("?")[1]?.trim() || t.notYou}
      </EmailText>

      <EmailFooter websiteName={websiteName} helpCenterText={tCommon.helpCenter} />
    </EmailLayout>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <EmailText className="my-space-xs">
      <strong>{label}:</strong> {value}
    </EmailText>
  );
}

export default AccountLockoutEmail;
