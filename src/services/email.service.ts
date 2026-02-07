import type { ReactElement } from "react";
import { getGmailStatus, isGmailConfigured, sendEmail } from "@/lib/gmail";
import { logger } from "@/lib/logger";
import { renderEmailBoth } from "@/emails/render";

export interface SendEmailParams {
  to: string;
  subject: string;
  template: ReactElement;
}

export class EmailService {
  /**
   * Check if email is configured and available
   */
  isEmailConfigured(): boolean {
    return isGmailConfigured();
  }

  /**
   * Get email status for display
   */
  getEmailStatus() {
    return getGmailStatus();
  }

  /**
   * Send an email using a React Email template
   */
  async sendTemplateEmail(params: SendEmailParams): Promise<boolean> {
    try {
      if (!isGmailConfigured()) {
        logger.error(
          { to: params.to, subject: params.subject },
          "Email configuration not available",
        );
        return false;
      }

      const { html, text } = await renderEmailBoth(params.template);

      await sendEmail({
        to: params.to,
        subject: params.subject,
        html,
        text,
      });

      return true;
    } catch (error) {
      logger.error({ error, to: params.to, subject: params.subject }, "Error sending email");
      return false;
    }
  }
}
