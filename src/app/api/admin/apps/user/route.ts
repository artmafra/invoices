import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { getAppsForUser } from "@/lib/apps.server";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";

/**
 * GET /api/admin/apps/user
 * Returns apps filtered by the current user's apps.
 * Used by AppsProvider to refetch after impersonation changes.
 */
export const GET = withErrorHandler(async () => {
  const session = await auth();

  if (!session?.user) {
    throw new UnauthorizedError();
  }

  const apps = getAppsForUser(session.user.apps || []);

  return NextResponse.json(apps);
});
