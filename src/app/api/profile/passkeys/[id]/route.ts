import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { passkeyService } from "@/services/runtime/passkey";
import { userSessionService } from "@/services/runtime/user-session";
import { passkeyIdParamSchema, renamePasskeySchema } from "@/validations/passkey.validations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Rename a passkey
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("default", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const { id } = passkeyIdParamSchema.parse(await params);
  const body = await request.json();

  const result = renamePasskeySchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  await passkeyService.renamePasskey(session.user.id, id, result.data.name);

  return NextResponse.json({ success: true });
});

// Delete a passkey
export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {
  // Rate limit sensitive operations
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for deleting a passkey
  requireStepUpAuth(session);

  const { id } = passkeyIdParamSchema.parse(await params);

  await passkeyService.deletePasskey(session.user.id, id);

  // SECURITY: Revoke all other sessions after passkey removal
  // Keep current session so user doesn't get logged out
  const currentSessionId = session.user.sessionId;
  if (currentSessionId) {
    const revokedCount = await userSessionService.revokeAllUserSessions(
      session.user.id,
      currentSessionId,
    );
    if (revokedCount > 0) {
      logger.info(
        { userId: session.user.id, revokedSessionsCount: revokedCount },
        "Passkey deleted: revoked other sessions",
      );
    }
  }

  // Log activity
  await activityService.logAction(session, "remove_passkey", "users", {
    type: "user",
    id: session.user.id,
    name: session.user.name || session.user.email || undefined,
  });

  return NextResponse.json({ success: true });
});
