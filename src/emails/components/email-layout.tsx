import type { ReactNode } from "react";
import { Body, Container, Head, Html, Preview, Tailwind } from "@react-email/components";
import { EmailHeader } from "./email-header";

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
  websiteName?: string;
}

/**
 * Base layout component for all email templates.
 * Clean, minimal design inspired by Google emails.
 */
export function EmailLayout({ preview, children, websiteName }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="font-sans">
          <Container className="mx-auto max-w-[600px] px-button-x py-space-lg">
            <EmailHeader websiteName={websiteName} />
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
