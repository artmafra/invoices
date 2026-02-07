import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { taskService } from "@/services/runtime/task";
import { createTaskListSchema } from "@/validations/task.validations";

/**
 * GET /api/admin/tasks/lists
 * List all task lists
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("tasks", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  return handleConditionalRequest(
    request,
    async () => {
      const version = await taskService.getListsCollectionVersion();
      return `task-lists:${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}`;
    },
    async () => {
      return taskService.getAllListsWithCounts();
    },
  );
});

/**
 * POST /api/admin/tasks/lists
 * Create a new task list
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("tasks", "create");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = createTaskListSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const list = await taskService.createList({
    ...validation.data,
    createdById: session.user.id,
  });

  await activityService.logCreate(session, "tasks", {
    type: "task-list",
    id: list.id,
    name: list.name,
  });

  return NextResponse.json(list, { status: 201 });
});
