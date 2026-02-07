import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { handleConditionalRequest } from "@/lib/http/etag";
import { requirePermission } from "@/lib/permissions";
import { permissionService } from "@/services/runtime/permission";

// Static version for permissions - they're defined in code, not DB.
// Increment this when PERMISSION_DESCRIPTIONS or RESOURCE_ACTIONS changes.
const PERMISSIONS_VERSION = "v2";

// GET - List all permissions grouped by resource
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { authorized, error, status } = await requirePermission("roles", "view");

  if (!authorized) {
    if (status === 401) throw new UnauthorizedError(error);
    throw new ForbiddenError(error);
  }

  return handleConditionalRequest(
    request,
    () => PERMISSIONS_VERSION,
    async () => {
      return permissionService.getPermissionsGrouped();
    },
  );
});
