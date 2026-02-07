import type { QueueJob, QueueJobNew } from "@/schema/queue-jobs.schema";
import { queueJobStorage } from "@/storage/runtime/queue-job";

/**
 * Service layer for queue job operations.
 * Provides business logic abstraction over queue job storage.
 */
export class QueueJobService {
  /**
   * Create a new queue job record
   */
  async createJob(data: QueueJobNew): Promise<QueueJob> {
    return queueJobStorage.create(data);
  }

  /**
   * Delete completed jobs older than specified days
   * @param days - Number of days to keep completed jobs
   * @returns Number of deleted jobs
   */
  async deleteCompletedOlderThan(days: number): Promise<number> {
    return queueJobStorage.deleteCompletedOlderThan(days);
  }

  /**
   * Delete failed jobs older than specified days
   * @param days - Number of days to keep failed jobs
   * @returns Number of deleted jobs
   */
  async deleteFailedOlderThan(days: number): Promise<number> {
    return queueJobStorage.deleteFailedOlderThan(days);
  }

  /**
   * Get recent jobs (for debugging/monitoring)
   * @param limit - Number of jobs to return
   */
  async getRecentJobs(limit: number = 50): Promise<QueueJob[]> {
    return queueJobStorage.getRecent(limit);
  }
}
