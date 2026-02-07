import { queueJobsTable, type QueueJob, type QueueJobNew } from "@/schema/queue-jobs.schema";
import { and, desc, eq, lte } from "drizzle-orm";
import { db } from "@/db/postgres";

/**
 * Storage layer for queue job audit trail
 */
export class QueueJobStorage {
  /**
   * Create a new queue job record
   */
  async create(data: QueueJobNew): Promise<QueueJob> {
    const [job] = await db.insert(queueJobsTable).values(data).returning();
    return job;
  }

  /**
   * Delete completed jobs older than specified days
   * @param days - Number of days to keep completed jobs
   * @returns Number of deleted jobs
   */
  async deleteCompletedOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(queueJobsTable)
      .where(and(lte(queueJobsTable.createdAt, cutoffDate), eq(queueJobsTable.status, "completed")))
      .returning({ id: queueJobsTable.id });

    return result.length;
  }

  /**
   * Delete failed jobs older than specified days
   * @param days - Number of days to keep failed jobs
   * @returns Number of deleted jobs
   */
  async deleteFailedOlderThan(days: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const result = await db
      .delete(queueJobsTable)
      .where(and(lte(queueJobsTable.createdAt, cutoffDate), eq(queueJobsTable.status, "failed")))
      .returning({ id: queueJobsTable.id });

    return result.length;
  }

  /**
   * Get recent jobs (for debugging/monitoring)
   * @param limit - Number of jobs to return
   */
  async getRecent(limit: number = 100): Promise<QueueJob[]> {
    return db.select().from(queueJobsTable).orderBy(desc(queueJobsTable.createdAt)).limit(limit);
  }
}
