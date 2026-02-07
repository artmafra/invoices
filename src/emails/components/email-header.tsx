import { Column, Img, Row, Section } from "@react-email/components";
import { siteConfig } from "@/config/site.config";

interface EmailHeaderProps {
  websiteName?: string;
}

/**
 * Header component with logo and site name for email templates.
 * Left-aligned layout inspired by Google emails.
 */
export function EmailHeader({ websiteName }: EmailHeaderProps) {
  const siteName = websiteName || siteConfig.name;

  return (
    <Section className="mb-section">
      <Row>
        <Column>
          <Img
            src={siteConfig.emailLogoUrl}
            width="164"
            height="42"
            alt={siteName}
            className="text-2xl font-bold"
          />
        </Column>
      </Row>
    </Section>
  );
}
