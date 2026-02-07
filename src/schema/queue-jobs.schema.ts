import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Queue jobs table
 * Stores audit trail of all jobs processed by BullMQ workers
 */
export const queueJobsTable = pgTable("queue_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  queueName: text("queue_name").notNull(),
  jobId: text("job_id").notNull(),
  type: text("type").notNull(),
  priority: integer("priority").notNull(),
  status: text("status").notNull(), // pending, processing, completed, failed
  attempts: integer("attempts").notNull().default(0),
  data: jsonb("data").notNull(),
  error: text("error"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type QueueJob = typeof queueJobsTable.$inferSelect;
export type QueueJobNew = typeof queueJobsTable.$inferInsert;
