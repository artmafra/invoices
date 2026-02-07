import { taskListsTable } from "@/schema/task-lists.schema";
import { usersTable } from "@/schema/users.schema";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Checklist item within a task
 */
export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

/**
 * Task status enum values
 */
export const TASK_STATUSES = ["todo", "in_progress", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/**
 * Task priority enum values
 */
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

/**
 * Tasks table
 * Individual task items with status, priority, and assignments
 */
export const tasksTable = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Task title */
    title: varchar("title", { length: 255 }).notNull(),
    /** Task description (markdown supported) */
    description: text("description"),
    /** Current status */
    status: varchar("status", { length: 20 }).default("todo").notNull().$type<TaskStatus>(),
    /** Priority level */
    priority: varchar("priority", { length: 20 }).default("medium").notNull().$type<TaskPriority>(),
    /** Optional due date */
    dueDate: timestamp("due_date"),
    /** Task list this task belongs to (optional) */
    listId: uuid("list_id").references(() => taskListsTable.id, { onDelete: "set null" }),
    /** User assigned to this task */
    assigneeId: uuid("assignee_id").references(() => usersTable.id, { onDelete: "set null" }),
    /** User who created the task */
    createdById: uuid("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
    /** Display order within a list */
    sortOrder: integer("sort_order").default(0).notNull(),
    /** When the task was completed */
    completedAt: timestamp("completed_at"),
    /** Checklist items within the task */
    checklistItems: jsonb("checklist_items").$type<ChecklistItem[]>().default([]).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("tasks_list_id_idx").on(table.listId),
    index("tasks_assignee_id_idx").on(table.assigneeId),
    index("tasks_created_by_id_idx").on(table.createdById),
    index("tasks_status_idx").on(table.status),
    index("tasks_due_date_idx").on(table.dueDate),
  ],
);

export type Task = typeof tasksTable.$inferSelect;
export type TaskNew = typeof tasksTable.$inferInsert;
