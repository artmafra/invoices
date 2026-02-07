import { Section } from "@react-email/components";
import { EmailFooter, EmailLayout, EmailText } from "@/emails/components";
import type { EmailCommonTranslations, SecurityAlertTranslations } from "@/emails/get-translations";

/**
 * Types of security alerts supported by this template.
 */
export type SecurityAlertType =
  | "2fa-email-enabled"
  | "2fa-email-disabled"
  | "totp-enabled"
  | "totp-disabled"
  | "passkey-added"
  | "passkey-removed"
  | "password-changed"
  | "email-changed"
  | "primary-email-changed"
  | "google-linked"
  | "google-unlinked"
  | "account-deactivated";

/**
 * Map from alert type to translation key
 */
const ALERT_TYPE_TO_KEY: Record<
  SecurityAlertType,
  keyof Omit<SecurityAlertTranslations, "notYouWarning" | "labels">
> = {
  "2fa-email-enabled": "twoFactorEmailEnabled",
  "2fa-email-disabled": "twoFactorEmailDisabled",
  "totp-enabled": "totpEnabled",
  "totp-disabled": "totpDisabled",
  "passkey-added": "passkeyAdded",
  "passkey-removed": "passkeyRemoved",
  "password-changed": "passwordChanged",
  "email-changed": "emailChanged",
  "primary-email-changed": "primaryEmailChanged",
  "google-linked": "googleLinked",
  "google-unlinked": "googleUnlinked",
  "account-deactivated": "accountDeactivated",
};

/**
 * Alert types that should show the "not you?" warning
 */
const SHOW_WARNING: Set<SecurityAlertType> = new Set([
  "2fa-email-enabled",
  "2fa-email-disabled",
  "totp-enabled",
  "totp-disabled",
  "passkey-added",
  "passkey-removed",
  "password-changed",
  "email-changed",
  "primary-email-changed",
  "google-linked",
  "google-unlinked",
]);

interface SecurityAlertEmailProps {
  /** Type of security alert */
  alertType: SecurityAlertType;
  /** User's name for personalization */
  userName?: string;
  /** Timestamp of when the change occurred */
  changedAt: string;
  /** Device/browser info if available */
  deviceInfo?: string;
  /** IP address if available */
  ipAddress?: string;
  /** Additional context (e.g., new email address, session device) */
  additionalInfo?: string;
  /** Website/app name for branding */
  websiteName?: string;
  t: SecurityAlertTranslations;
  tCommon: EmailCommonTranslations;
}

/**
 * Consolidated email template for security-related account changes.
 * Covers 2FA changes, password changes, email changes, OAuth linking, and session management.
 */
export function SecurityAlertEmail({
  alertType = "google-unlinked",
  userName,
  changedAt,
  deviceInfo,
  ipAddress,
  additionalInfo,
  websiteName,
  t,
  tCommon,
}: SecurityAlertEmailProps) {
  const translationKey = ALERT_TYPE_TO_KEY[alertType];
  const alertTranslation = t[translationKey];
  const greeting = userName ? tCommon.hiName.replace("{name}", userName) : tCommon.hello;
  const showWarning = SHOW_WARNING.has(alertType);

  return (
    <EmailLayout preview={alertTranslation.preview} websiteName={websiteName}>
      <EmailText>{greeting}</EmailText>

      <EmailText>{alertTranslation.body}</EmailText>

      <Section>
        <DetailRow label={t.labels.time} value={changedAt} />
        {deviceInfo && <DetailRow label={t.labels.device} value={deviceInfo} />}
        {ipAddress && <DetailRow label={t.labels.ip} value={ipAddress} />}
        {additionalInfo && <DetailRow label={t.labels.info} value={additionalInfo} />}
      </Section>

      {showWarning && <EmailText>{t.notYouWarning}</EmailText>}

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

export default SecurityAlertEmail;
