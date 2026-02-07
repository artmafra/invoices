import type { ReactElement } from "react";
import { JobPriority, type EmailJobData } from "@/types/common/queue.types";
import { logger } from "@/lib/logger";
import { BaseQueue } from "@/lib/queue/base-queue";
import { renderEmailBoth } from "@/emails/render";

/**
 * Email queue service
 * Handles async email sending with retry logic
 */
export class EmailQueueService extends BaseQueue<EmailJobData> {
  constructor() {
    super("email");
  }

  /**
   * Enqueue an email for sending
   *
   * @param params - Email parameters
   * @param params.to - Recipient email address
   * @param params.subject - Email subject
   * @param params.template - React Email template component
   * @param params.priority - Job priority (defaults to NORMAL)
   * @param params.userId - Optional user ID for activity logging
   * @param params.metadata - Optional metadata for logging
   * @returns Job ID
   */
  async enqueueEmail({
    to,
    subject,
    template,
    templateName,
    priority = JobPriority.NORMAL,
    userId,
    metadata,
  }: {
    to: string;
    subject: string;
    template: ReactElement;
    templateName: string;
    priority?: JobPriority;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    try {
      // Pre-render the email template to HTML and text
      const { html, text } = await renderEmailBoth(template);

      const jobData: EmailJobData = {
        to,
        subject,
        templateName,
        templateHtml: html,
        templateText: text,
        priority,
        userId,
        metadata,
      };

      const jobId = await this.enqueue(jobData);

      logger.info(
        {
          jobId,
          to,
          subject,
          templateName,
          priority,
          userId,
        },
        "[Queue] Email queued for sending",
      );

      return jobId;
    } catch (error) {
      logger.error(
        {
          error,
          to,
          subject,
          templateName,
          userId,
        },
        "[Queue] Failed to enqueue email",
      );
      throw error;
    }
  }
}
