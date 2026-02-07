import { NextRequest, NextResponse } from "next/server";
import type { RegenerateBackupCodesResponse } from "@/types/auth/auth.types";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { twoFactorService } from "@/services/runtime/two-factor";

// Regenerate backup codes for current user
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit sensitive action
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up authentication
  requireStepUpAuth(session);

  const backupCodes = await twoFactorService.backupRegenerateCodes(session.user.id);

  // Log activity
  await activityService.logAction(
    session,
    "regenerate_backup_codes",
    "users",
    { type: "user", id: session.user.id, name: session.user.email ?? undefined },
    { metadata: { codesCount: backupCodes.length } },
  );

  const response: RegenerateBackupCodesResponse = {
    success: true,
    message: "Backup codes regenerated successfully",
    backupCodes,
  };

  return NextResponse.json(response);
});
