import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { getActivityQuerySchema } from "@/validations/activity.validations";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Check permission
  const { authorized, error, status } = await requirePermission("activity", "view");
  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  // Parse and validate query parameters
  const { searchParams } = new URL(request.url);

  const queryResult = getActivityQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));

  if (!queryResult.success) {
    throw new ValidationError("Invalid query parameters", queryResult.error.flatten());
  }

  const query = queryResult.data;

  const { page = 1, limit = 20, userId, action, resource, startDate, endDate, search } = query;

  // Build filters
  const filters = {
    userId,
    action,
    resource,
    startDate,
    endDate,
    search,
  };

  // Get paginated activity
  const result = await activityService.getActivities(filters, { page, limit });

  return NextResponse.json(result);
});
