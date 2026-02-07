import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import {
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  UnauthorizedError,
} from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { activityService } from "@/services/runtime/activity";
import { loginProtectionService } from "@/services/runtime/login-protection";
import { userService } from "@/services/runtime/user";
import { userIdParamSchema } from "@/validations/user.validations";

// POST /api/admin/users/[userId]/unlock - Unlock a user's account
export const POST = withErrorHandler(
  async (request: NextRequest, context: { params: Promise<{ userId: string }> }) => {
    const { authorized, error, status, session } = await requirePermission("users", "activate");

    if (!authorized) {
      if (status === 401) throw new UnauthorizedError(error);
      throw new ForbiddenError(error);
    }

    const { userId } = userIdParamSchema.parse(await context.params);

    // Get the user to unlock
    const user = await userService.getUserById(userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    // Unlock the account
    const unlocked = await loginProtectionService.unlockAccount(user.email);
    if (!unlocked) {
      throw new ServiceUnavailableError("Service temporarily unavailable. Please try again later.");
    }

    // Log activity
    await activityService.logAction(session, "unlock", "users", {
      type: "user",
      id: userId,
      name: user.name || user.email,
    });

    return NextResponse.json({
      success: true,
      message: "Account unlocked successfully",
    });
  },
);
