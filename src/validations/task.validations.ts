import { TASK_PRIORITIES, TASK_STATUSES } from "@/schema/tasks.schema";
import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// ========================================
// Task Query Schemas
// ========================================

export const getTasksQuerySchema = baseQuerySchema.extend({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  listId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().optional(),
  includeCompleted: z.coerce.boolean().optional(),
});

// ========================================
// Checklist Item Schema
// ========================================

export const checklistItemSchema = z.object({
  id: z.uuid(),
  text: z
    .string()
    .min(1, "Checklist item text is required")
    .max(500, "Checklist item text is too long"),
  checked: z.boolean(),
});

export type ChecklistItem = z.infer<typeof checklistItemSchema>;

// ========================================
// Task Param Schemas
// ========================================

export const taskIdParamSchema = z.object({
  taskId: z.uuid("Invalid task ID format"),
});

export type TaskIdParam = z.infer<typeof taskIdParamSchema>;

export const listIdParamSchema = z.object({
  listId: z.uuid("Invalid list ID format"),
});

export type ListIdParam = z.infer<typeof listIdParamSchema>;

// ========================================
// Task Validation Schemas
// ========================================

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  listId: z.uuid().optional().nullable(),
  assigneeId: z.uuid().optional().nullable(),
  checklistItems: z
    .array(checklistItemSchema)
    .max(20, "Maximum 20 checklist items allowed")
    .optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  listId: z.uuid().nullable().optional(),
  assigneeId: z.uuid().nullable().optional(),
  sortOrder: z.number().optional(),
  checklistItems: z
    .array(checklistItemSchema)
    .max(20, "Maximum 20 checklist items allowed")
    .optional(),
});

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ========================================
// Task List Validation Schemas
// ========================================

export const createTaskListSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  color: z.string().max(20).optional(),
});

export type CreateTaskListInput = z.infer<typeof createTaskListSchema>;

export const updateTaskListSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  sortOrder: z.number().optional(),
});

export type UpdateTaskListInput = z.infer<typeof updateTaskListSchema>;
