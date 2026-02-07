import { Hr, Link, Section } from "@react-email/components";
import { siteConfig } from "@/config/site.config";
import { EmailText } from "@/emails/components/email-text";

interface EmailFooterProps {
  websiteName?: string;
  /** Translated "Help center" text */
  helpCenterText?: string;
}

/**
 * Minimal footer for email templates.
 * Clean design inspired by Google emails.
 */
export function EmailFooter({ websiteName, helpCenterText = "Help center" }: EmailFooterProps) {
  const siteName = websiteName || siteConfig.name;
  const helpUrl = siteConfig.helpUrl;

  return (
    <Section>
      <Hr className="m-0 mt-section border-neutral-500/30 border-t-2" />
      <EmailText small>
        © {new Date().getFullYear()} {siteName}
        {helpUrl && (
          <>
            {" · "}
            <Link href={helpUrl} className="underline">
              {helpCenterText}
            </Link>
          </>
        )}
      </EmailText>
    </Section>
  );
}
