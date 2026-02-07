import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { twoFactorService } from "@/services/runtime/two-factor";
import { userSessionService } from "@/services/runtime/user-session";

// Disable email 2FA
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit sensitive operations
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for disabling 2FA
  requireStepUpAuth(session);

  // Disable email 2FA
  await twoFactorService.emailDisable(session.user.id);

  // SECURITY: Revoke all other sessions after disabling 2FA
  // Keep current session so user doesn't get logged out
  const currentSessionId = session.sessionId;
  if (currentSessionId) {
    const revokedCount = await userSessionService.revokeAllUserSessions(
      session.user.id,
      currentSessionId,
    );
    if (revokedCount > 0) {
      logger.info(
        { userId: session.user.id, revokedSessionsCount: revokedCount },
        "Email 2FA disabled: revoked other sessions",
      );
    }
  }

  // Log activity
  await activityService.logAction(session, "disable_2fa_email", "users", {
    type: "user",
    id: session.user.id,
    name: session.user.name || session.user.email || undefined,
  });

  return NextResponse.json({
    success: true,
    message: "Email 2FA disabled successfully",
  });
});
