import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { userService } from "@/services/runtime/user";
import { userIdParamSchema } from "@/validations/user.validations";

// POST /api/admin/users/[userId]/reactivate - Reactivate a user
export const POST = withErrorHandler(
  async (request: NextRequest, context: { params: Promise<{ userId: string }> }) => {
    const { authorized, error, status, session } = await requirePermission("users", "activate");

    if (!authorized) {
      if (status === 401) throw new UnauthorizedError(error);
      throw new ForbiddenError(error);
    }

    const { userId } = userIdParamSchema.parse(await context.params);

    try {
      const user = await userService.reactivateUser(userId);

      // Log activity
      await activityService.logAction(session, "reactivate", "users", {
        type: "user",
        id: userId,
        name: user.name || user.email,
      });

      return NextResponse.json(user);
    } catch (err: unknown) {
      const error = err as { message?: string };
      if (error.message?.includes("not found")) {
        throw new NotFoundError("User");
      }
      throw err;
    }
  },
);
