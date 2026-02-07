import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import {
  ForbiddenError,
  fromZodError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { activityService } from "@/services/runtime/activity";
import { appPermissionsService } from "@/services/runtime/app-permissions";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";
import { userIdParamSchema } from "@/validations/user.validations";

// Validation schema for PUT request - object mapping appId to array of actions
const updateAppPermissionsSchema = z.object({
  permissions: z.record(z.string(), z.array(z.string())),
});

/**
 * GET /api/admin/users/[userId]/app-permissions
 * Get user's app permissions
 */
export const GET = withErrorHandler(
  async (_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    const { userId } = userIdParamSchema.parse(await params);

    // Check permission - either users.app-permissions or viewing own permissions
    const canView =
      session.user.permissions.includes("users.app-permissions") ||
      session.user.permissions.includes("users.view") ||
      session.user.id === userId;

    if (!canView) {
      throw new ForbiddenError();
    }

    const result = await appPermissionsService.getUserAppPermissionsResult(userId);

    return NextResponse.json({
      permissions: result.byApp, // { appId: [actions] }
      apps: result.apps, // [appIds]
    });
  },
);

/**
 * PUT /api/admin/users/[userId]/app-permissions
 * Set user's app permissions (replaces existing)
 */
export const PUT = withErrorHandler(
  async (request: NextRequest, { params }: { params: Promise<{ userId: string }> }) => {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    const { userId } = userIdParamSchema.parse(await params);

    // Check permission
    if (!session.user.permissions.includes("users.app-permissions")) {
      throw new ForbiddenError();
    }

    // Self-grant restriction: cannot modify own permissions unless system role
    const targetUser = await userService.getUserById(userId);
    if (!targetUser) {
      throw new NotFoundError("User");
    }

    if (session.user.id === userId) {
      const isSystemRole = session.user.role === "system";
      if (!isSystemRole) {
        throw new ForbiddenError("Cannot modify your own app permissions");
      }
    }

    // Parse and validate request body
    const body = await request.json();

    let validatedData;
    try {
      validatedData = updateAppPermissionsSchema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw fromZodError(error);
      }
      throw error;
    }

    const { permissions } = validatedData;

    // Get old permissions for activity log
    const oldResult = await appPermissionsService.getUserAppPermissionsResult(userId);

    // Update app permissions
    try {
      await appPermissionsService.setAllPermissions(session.user.id, userId, permissions);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Invalid")) {
        throw new ValidationError(err.message);
      }
      throw err;
    }

    // Get new permissions for response
    const newResult = await appPermissionsService.getUserAppPermissionsResult(userId);

    // Log activity - compute changes as added/removed permissions per app
    const changes: { field: string; added?: string[]; removed?: string[] }[] = [];
    const allAppIds = new Set([...Object.keys(oldResult.byApp), ...Object.keys(newResult.byApp)]);

    for (const appId of allAppIds) {
      const oldPerms = oldResult.byApp[appId] || [];
      const newPerms = newResult.byApp[appId] || [];
      const added = newPerms.filter((p: string) => !oldPerms.includes(p));
      const removed = oldPerms.filter((p: string) => !newPerms.includes(p));

      if (added.length > 0 || removed.length > 0) {
        changes.push({
          field: `${appId} permissions`,
          added: added.length > 0 ? added : undefined,
          removed: removed.length > 0 ? removed : undefined,
        });
      }
    }

    await activityService.logUpdate(
      session,
      "users",
      { type: "user", id: userId, name: targetUser.name || targetUser.email },
      changes,
    );

    // Revoke sessions if app permissions changed to enforce new permissions immediately
    if (changes.length > 0) {
      await userSessionService.revokeSessionsForAppPermissionsUpdate(
        userId,
        session!.user.sessionId, // Preserve admin's session
      );
    }

    return NextResponse.json({
      success: true,
      permissions: newResult.byApp,
      apps: newResult.apps,
    });
  },
);
