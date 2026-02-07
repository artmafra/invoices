import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { taskService, taskService as taskServiceForLists } from "@/services/runtime/task";
import { taskIdParamSchema, updateTaskSchema } from "@/validations/task.validations";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * GET /api/admin/tasks/[taskId]
 * Get a single task by ID
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("tasks", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { taskId } = taskIdParamSchema.parse(await params);

  const task = await taskService.getByIdWithRelations(taskId);

  if (!task) {
    throw new NotFoundError("Task");
  }

  return NextResponse.json(task);
});

/**
 * PATCH /api/admin/tasks/[taskId]
 * Update a task
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("tasks", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { taskId } = taskIdParamSchema.parse(await params);

  const existingTask = await taskService.getById(taskId);

  if (!existingTask) {
    throw new NotFoundError("Task");
  }

  const body = await request.json();
  const validation = updateTaskSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const updateData: Parameters<typeof taskService.update>[1] = {};

  if (validation.data.title !== undefined) updateData.title = validation.data.title;
  if (validation.data.description !== undefined)
    updateData.description = validation.data.description;
  if (validation.data.status !== undefined) updateData.status = validation.data.status;
  if (validation.data.priority !== undefined) updateData.priority = validation.data.priority;
  if (validation.data.dueDate !== undefined) {
    updateData.dueDate = validation.data.dueDate ? new Date(validation.data.dueDate) : null;
  }
  if (validation.data.listId !== undefined) updateData.listId = validation.data.listId;
  if (validation.data.assigneeId !== undefined) updateData.assigneeId = validation.data.assigneeId;
  if (validation.data.sortOrder !== undefined) updateData.sortOrder = validation.data.sortOrder;

  const task = await taskService.update(taskId, updateData);

  // Build changes array for fields that changed
  const changes = [];
  if (validation.data.title !== undefined && existingTask.title !== task.title) {
    changes.push({ field: "title", from: existingTask.title, to: task.title });
  }
  if (validation.data.status !== undefined && existingTask.status !== task.status) {
    changes.push({ field: "status", from: existingTask.status, to: task.status });
  }
  if (validation.data.priority !== undefined && existingTask.priority !== task.priority) {
    changes.push({ field: "priority", from: existingTask.priority, to: task.priority });
  }
  if (validation.data.assigneeId !== undefined && existingTask.assigneeId !== task.assigneeId) {
    changes.push({ field: "assignee", from: existingTask.assigneeId, to: task.assigneeId });
  }
  if (validation.data.listId !== undefined && existingTask.listId !== task.listId) {
    // Lookup list names for better activity log display
    const [oldList, newList] = await Promise.all([
      existingTask.listId ? taskServiceForLists.getListById(existingTask.listId) : null,
      task.listId ? taskServiceForLists.getListById(task.listId) : null,
    ]);
    changes.push({
      field: "list",
      from: oldList?.name || existingTask.listId,
      to: newList?.name || task.listId,
    });
  }

  await activityService.logUpdate(
    session,
    "tasks",
    { type: "task", id: task.id, name: task.title },
    changes,
  );

  return NextResponse.json(task);
});

/**
 * DELETE /api/admin/tasks/[taskId]
 * Delete a task
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("tasks", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { taskId } = taskIdParamSchema.parse(await params);

  const existingTask = await taskService.getById(taskId);

  if (!existingTask) {
    throw new NotFoundError("Task");
  }

  await taskService.delete(taskId);

  await activityService.logDelete(session, "tasks", {
    type: "task",
    id: taskId,
    name: existingTask.title,
  });

  return NextResponse.json({ success: true });
});
