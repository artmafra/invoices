import { Queue, type JobsOptions } from "bullmq";
import { JobPriority, type BaseJobData } from "@/types/common/queue.types";
import { logger } from "@/lib/logger";
import { createRedisConnection, DEFAULT_QUEUE_OPTIONS } from "./config";

/**
 * Generic base queue class for BullMQ
 * Provides type-safe wrapper around BullMQ Queue
 *
 * @template T - Job data type (must extend BaseJobData)
 *
 * @example
 * ```ts
 * // Create a custom queue
 * class MyQueue extends BaseQueue<MyJobData> {
 *   constructor() {
 *     super("my-queue");
 *   }
 *
 *   async enqueueMyJob(data: MyJobData) {
 *     return this.enqueue(data);
 *   }
 * }
 * ```
 */
export abstract class BaseQueue<T extends BaseJobData> {
  private queue: Queue<T> | null = null;
  protected queueName: string;

  constructor(queueName: string) {
    this.queueName = queueName;
    // Lazy initialization: Queue is created on first access, not on import
    // This prevents unnecessary Redis connections during Next.js build process
  }

  /**
   * Get or create the queue instance (lazy initialization)
   * Only initializes when first accessed, not when the module is imported
   */
  private getOrCreateQueue(): Queue<T> {
    if (!this.queue) {
      this.queue = new Queue<T>(this.queueName, {
        connection: createRedisConnection(),
        ...DEFAULT_QUEUE_OPTIONS,
      });
      logger.info({ queueName: this.queueName }, "[Queue] Initialized");
    }
    return this.queue;
  }

  /**
   * Add a job to the queue
   *
   * @param data - Job data
   * @param options - Optional BullMQ job options (overrides defaults)
   * @returns Job instance
   */
  protected async enqueue(data: T, options?: Partial<JobsOptions>): Promise<string> {
    const priority = data.priority ?? JobPriority.NORMAL;
    const queue = this.getOrCreateQueue();

    const job = await queue.add(this.queueName as any, data as any, {
      ...options,
      priority,
    });

    logger.info(
      {
        jobId: job.id,
        queueName: this.queueName,
        priority,
        userId: data.userId,
      },
      "[Queue] Job enqueued",
    );

    return job.id ?? "";
  }

  /**
   * Get the underlying BullMQ queue instance
   * Use this for advanced queue operations
   */
  public getQueue(): Queue<T> {
    return this.getOrCreateQueue();
  }

  /**
   * Get queue metrics
   */
  async getMetrics() {
    const queue = this.getOrCreateQueue();
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Graceful shutdown
   * Call this when the application is shutting down
   */
  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      logger.info({ queueName: this.queueName }, "[Queue] Closed");
    }
  }
}
