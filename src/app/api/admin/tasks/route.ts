import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, fromZodError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { buildQueryParamsSeed, handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { taskService } from "@/services/runtime/task";
import { createTaskSchema, getTasksQuerySchema } from "@/validations/task.validations";

/**
 * GET /api/admin/tasks
 * List all tasks with pagination
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("tasks", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Parse and validate query parameters
  const queryResult = getTasksQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );

  if (!queryResult.success) {
    throw fromZodError(queryResult.error);
  }

  const query = queryResult.data;

  const filters = {
    search: query.search,
    status: query.status,
    priority: query.priority,
    listId: query.listId === "null" ? null : query.listId,
    assigneeId: query.assigneeId,
    includeCompleted: query.includeCompleted,
  };

  const options = {
    page: query.page,
    limit: query.limit,
  };

  const queryParamsSeed = buildQueryParamsSeed({ ...filters, ...options });

  return handleConditionalRequest(
    request,
    async () => {
      const version = await taskService.getCollectionVersion(filters);
      return `${version.maxUpdatedAt?.toISOString() ?? "empty"}:${version.count}:${queryParamsSeed}`;
    },
    async () => {
      return taskService.getPaginated(filters, options);
    },
  );
});

/**
 * POST /api/admin/tasks
 * Create a new task
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status, session } = await requirePermission("tasks", "create");

  if (!authorized || !session) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  const body = await request.json();
  const validation = createTaskSchema.safeParse(body);

  if (!validation.success) {
    throw new ValidationError("Validation failed", validation.error.flatten());
  }

  const task = await taskService.create({
    title: validation.data.title,
    description: validation.data.description,
    status: validation.data.status,
    priority: validation.data.priority,
    dueDate: validation.data.dueDate ? new Date(validation.data.dueDate) : undefined,
    listId: validation.data.listId ?? undefined,
    assigneeId: validation.data.assigneeId ?? undefined,
    createdById: session.user.id,
  });

  // Task already includes list info via DTO, use task.list.name if needed
  await activityService.logCreate(
    session,
    "tasks",
    { type: "task", id: task.id, name: task.title },
    {
      metadata: {
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        list: task.list?.name ?? null,
        description: task.description ?? null,
      },
    },
  );

  return NextResponse.json(task, { status: 201 });
});
