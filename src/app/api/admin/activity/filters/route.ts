import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Check permission
  const { authorized, error, status } = await requirePermission("activity", "view");
  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  return handleConditionalRequest(
    request,
    async () => {
      // Version based on activity table - when new activities are added,
      // the distinct actions/resources might change
      const version = await activityService.getFiltersVersion();
      return `activity-filters:${version.maxCreatedAt?.toISOString() ?? "empty"}:${version.count}`;
    },
    async () => {
      // Get distinct actions and resources for filter dropdowns
      const [actions, resources] = await Promise.all([
        activityService.getDistinctActions(),
        activityService.getDistinctResources(),
      ]);
      return { actions, resources };
    },
  );
});
