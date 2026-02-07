import { NextRequest } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { handleConditionalRequest } from "@/lib/http/etag";
import { appService } from "@/services/runtime/app";

// Static version for apps - they're defined in the registry, not DB.
// Increment this when APPS_REGISTRY changes.
const APPS_VERSION = "v2";

/**
 * GET /api/admin/apps/enabled
 * Returns all apps for sidebar navigation.
 * All apps are always enabled - the registry is the sole source of truth.
 * Requires authentication but not specific permissions (all users can see apps).
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  return handleConditionalRequest(
    request,
    () => APPS_VERSION,
    async () => {
      const apps = appService.getAllApps();

      // Return minimal data needed for sidebar navigation
      return apps.map((definition) => ({
        id: definition.id,
        slug: definition.slug,
        name: definition.name,
        // Icon name for client-side icon lookup
        iconName: definition.iconName,
        // Include permissions for app permissions management UI
        permissions: definition.permissions.map((p) => ({
          action: p.action,
          description: p.description,
        })),
      }));
    },
  );
});
