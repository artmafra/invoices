import { taskListsTable } from "@/schema/task-lists.schema";
import { tasksTable } from "@/schema/tasks.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// Admin Task Response Schema
// ========================================

// Base schema from database table
const adminTaskBaseSchema = createSelectSchema(tasksTable).pick({
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  listId: true,
  assigneeId: true,
  createdById: true,
});

// Extended schema with relations and JSON serialization
export const adminTaskResponseSchema = adminTaskBaseSchema
  .extend({
    // Date fields as strings for JSON serialization
    dueDate: z.string().nullable(),
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    // Related entities
    assignee: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
      })
      .nullable(),
    createdBy: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
      })
      .nullable(),
    list: z
      .object({
        id: z.string(),
        name: z.string(),
        color: z.string().nullable(),
      })
      .nullable(),
  })
  .strict();

// ========================================
// Admin Tasks List Response Schema (Paginated)
// ========================================

export const adminTasksListResponseSchema = z.object({
  data: z.array(adminTaskResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ========================================
// Task List Response Schema
// ========================================

// Base schema from database table
const taskListBaseSchema = createSelectSchema(taskListsTable).pick({
  id: true,
  name: true,
  description: true,
  color: true,
  sortOrder: true,
  createdById: true,
});

// Extended schema with computed fields and JSON serialization
export const taskListResponseSchema = taskListBaseSchema
  .extend({
    // Task count for this list
    taskCount: z.number(),
    // Date fields as strings for JSON serialization
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

// ========================================
// Task Lists Response Schema (Array)
// ========================================

export const taskListsResponseSchema = z.array(taskListResponseSchema);

// ========================================
// Type Exports
// ========================================

export type AdminTaskResponse = z.infer<typeof adminTaskResponseSchema>;
export type AdminTasksListResponse = z.infer<typeof adminTasksListResponseSchema>;
export type TaskListResponse = z.infer<typeof taskListResponseSchema>;
export type TaskListsResponse = z.infer<typeof taskListsResponseSchema>;
