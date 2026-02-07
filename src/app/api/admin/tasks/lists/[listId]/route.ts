import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { taskService } from "@/services/runtime/task";
import { listIdParamSchema, updateTaskListSchema } from "@/validations/task.validations";

interface RouteParams {
  params: Promise<{ listId: string }>;
}

/**
 * GET /api/admin/tasks/lists/[listId]
 * Get a single task list by ID
 */
export const GET = withErrorHandler(async (_request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status } = await requirePermission("tasks", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { listId } = listIdParamSchema.parse(await params);
  const list = await taskService.getListById(listId);

  if (!list) {
    throw new NotFoundError("Task list not found");
  }

  return NextResponse.json(list);
});

/**
 * PATCH /api/admin/tasks/lists/[listId]
 * Update a task list
 */
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("tasks", "edit");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { listId } = listIdParamSchema.parse(await params);
  const existingList = await taskService.getListById(listId);

  if (!existingList) {
    throw new NotFoundError("Task list not found");
  }

  const body = await request.json();
  const validation = updateTaskListSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const list = await taskService.updateList(listId, validation.data);

  // Build changes array for fields that changed
  const changes = [];
  if (existingList.name !== list.name) {
    changes.push({ field: "name", from: existingList.name, to: list.name });
  }
  if (existingList.color !== list.color) {
    changes.push({ field: "color", from: existingList.color, to: list.color });
  }

  await activityService.logUpdate(
    session,
    "tasks",
    { type: "task-list", id: list.id, name: list.name },
    changes,
  );

  return NextResponse.json(list);
});

/**
 * DELETE /api/admin/tasks/lists/[listId]
 * Delete a task list
 */
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  const { authorized, error, status, session } = await requirePermission("tasks", "delete");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const { listId } = listIdParamSchema.parse(await params);
  const existingList = await taskService.getListById(listId);

  if (!existingList) {
    throw new NotFoundError("Task list not found");
  }

  await taskService.deleteList(listId);

  await activityService.logDelete(session, "tasks", {
    type: "task-list",
    id: listId,
    name: existingList.name,
  });

  return NextResponse.json({ success: true });
});
