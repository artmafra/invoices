import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { fromZodError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { validatePasswordServer } from "@/lib/password-policy.server";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";
import { updatePasswordSchema } from "@/validations/profile.validations";

export const PUT = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // SECURITY: Require step-up authentication for password change
  requireStepUpAuth(session);

  const body = await request.json();

  let validatedData;
  try {
    validatedData = updatePasswordSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  // Validate new password against policy
  const passwordValidation = await validatePasswordServer(validatedData.newPassword);
  if (!passwordValidation.valid) {
    const firstError = passwordValidation.errors[0];
    throw new ValidationError(
      firstError?.key ?? "validation.passwordRequirements",
      firstError?.params,
    );
  }

  // Set new password (step-up auth already verified user identity)
  await userService.setPassword(session.user.id, validatedData.newPassword);

  // SECURITY: Revoke all other sessions after password change
  // Keep current session so user doesn't get logged out
  const currentSessionId = session.user.sessionId;
  if (currentSessionId) {
    const revokedCount = await userSessionService.revokeAllUserSessions(
      session.user.id,
      currentSessionId,
    );
    if (revokedCount > 0) {
      console.log(
        `Password change: revoked ${revokedCount} other session(s) for user ${session.user.id}`,
      );
    }
  }

  // Log activity
  await activityService.logAction(session, "change_password", "users", {
    type: "user",
    id: session.user.id,
    name: session.user.name || session.user.email || undefined,
  });

  return NextResponse.json({
    success: { code: "profile.password.updated" },
  });
});
