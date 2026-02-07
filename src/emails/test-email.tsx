import { Section } from "@react-email/components";
import { EmailFooter, EmailLayout, EmailText } from "@/emails/components";

interface TestEmailProps {
  websiteName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  sentAt?: string;
}

/**
 * Test email template for verifying email configuration.
 * Displays company settings to verify they are configured correctly.
 */
export function TestEmail({
  websiteName,
  companyEmail,
  companyPhone,
  companyAddress,
  sentAt,
}: TestEmailProps) {
  return (
    <EmailLayout
      preview="Test email - Your email configuration is working!"
      websiteName={websiteName}
    >
      <EmailText>
        This is a test email to verify that your email integration is working correctly. This is a
        test email to verify that your email integration is working correctly. This is a test email
        to verify that your email integration is working correctly. This is a test email to verify
        that your email integration is working correctly. This is a test email to verify that your
        email integration is working correctly.
      </EmailText>

      <EmailText>
        If you received this email, your email configuration is set up properly!
      </EmailText>

      <Section>
        <SettingRow label="Company Name" value={websiteName} />
        <SettingRow label="Email" value={companyEmail} />
        <SettingRow label="Phone" value={companyPhone} />
        <SettingRow label="Address" value={companyAddress} />
        <SettingRow label="Sent At" value={sentAt} />
      </Section>

      <EmailFooter websiteName={websiteName} />
    </EmailLayout>
  );
}

function SettingRow({ label, value }: { label: string; value?: string }) {
  return (
    <EmailText className="my-space-xs">
      <strong>{label}:</strong> {value || <em>Not set</em>}
    </EmailText>
  );
}

export default TestEmail;
