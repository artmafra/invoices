import "dotenv/config";
import { Worker, type Job } from "bullmq";
import type { EmailJobData } from "@/types/common/queue.types";
import { QueueJobStatus } from "@/types/common/queue.types";
import { isGmailConfigured, sendEmail } from "@/lib/gmail";
import { logger } from "@/lib/logger";
import { createRedisConnection, getWorkerConcurrency } from "@/lib/queue/config";
import { queueJobStorage } from "@/storage/runtime/queue-job";

/**
 * Email worker process
 * Processes email jobs from the BullMQ queue
 *
 * Run this in a separate process:
 * npm run worker
 */

const QUEUE_NAME = "email";

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, templateHtml, templateText, templateName, userId, metadata } = job.data;

  try {
    // Check if Gmail is configured
    if (!isGmailConfigured()) {
      throw new Error("Gmail is not configured");
    }

    // Create database record for audit trail
    await queueJobStorage.create({
      queueName: QUEUE_NAME,
      jobId: job.id ?? "",
      type: templateName,
      priority: job.opts.priority ?? 3,
      status: QueueJobStatus.PROCESSING,
      attempts: job.attemptsMade,
      data: {
        to,
        subject,
        templateName,
        userId,
        metadata,
      },
    });

    // Send email using pre-rendered HTML/text
    await sendEmail({
      to,
      subject,
      html: templateHtml,
      text: templateText,
    });

    // Update database record
    await queueJobStorage.create({
      queueName: QUEUE_NAME,
      jobId: job.id ?? "",
      type: templateName,
      priority: job.opts.priority ?? 3,
      status: QueueJobStatus.COMPLETED,
      attempts: job.attemptsMade,
      data: {
        to,
        subject,
        templateName,
        userId,
        metadata,
      },
      completedAt: new Date(),
    });

    // Log email sent
    if (userId) {
      logger.info(
        {
          userId,
          jobId: job.id,
          templateName,
          to,
          subject,
          attempt: job.attemptsMade,
          ...metadata,
        },
        "[BullMQ] Email sent successfully",
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error(
      {
        error,
        jobId: job.id,
        attemptsMade: job.attemptsMade,
        to,
        subject,
        templateName,
      },
      "[BullMQ] Failed to send email",
    );

    // Update database record with error
    await queueJobStorage.create({
      queueName: QUEUE_NAME,
      jobId: job.id ?? "",
      type: templateName,
      priority: job.opts.priority ?? 3,
      status: QueueJobStatus.FAILED,
      attempts: job.attemptsMade,
      data: {
        to,
        subject,
        templateName,
        userId,
        metadata,
      },
      error: errorMessage,
    });

    // Re-throw so BullMQ can handle retry logic
    throw error;
  }
}

// Create worker
const worker = new Worker<EmailJobData>(QUEUE_NAME, processEmailJob, {
  connection: createRedisConnection(),
  concurrency: getWorkerConcurrency(),
  limiter: {
    max: 10, // Process max 10 jobs per minute (Gmail API safety)
    duration: 60000,
  },
});

// Worker event handlers
worker.on("ready", () => {
  logger.info(
    {
      queueName: QUEUE_NAME,
      concurrency: getWorkerConcurrency(),
    },
    "[BullMQ] Email worker ready",
  );
});

worker.on("error", (err) => {
  logger.error({ error: err }, "[BullMQ] Email worker error");
});

// Graceful shutdown
async function gracefulShutdown() {
  logger.info("[BullMQ] Shutting down email worker");
  await worker.close();
  logger.info("[BullMQ] Email worker shut down");
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

logger.info(
  {
    queueName: QUEUE_NAME,
    concurrency: getWorkerConcurrency(),
  },
  "[BullMQ] Email worker started",
);
