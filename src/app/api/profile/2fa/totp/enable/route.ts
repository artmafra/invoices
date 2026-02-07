import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { fromZodError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { twoFactorService } from "@/services/runtime/two-factor";
import { enableTotpSchema } from "@/validations/2fa.validations";

// Verify TOTP code and enable TOTP 2FA
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit 2FA verification attempts
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("twoFactorVerify", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for enabling 2FA
  requireStepUpAuth(session);

  const body = await request.json().catch(() => ({}));

  let validatedData;
  try {
    validatedData = enableTotpSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  const { secret, code, backupCodes } = validatedData;

  // Verify and enable TOTP with backup codes
  const returnedBackupCodes = await twoFactorService.totpEnable(
    session.user.id,
    secret,
    code,
    backupCodes,
  );

  // Log activity
  await activityService.logAction(session, "enable_2fa_totp", "users", {
    type: "user",
    id: session.user.id,
    name: session.user.name || session.user.email || undefined,
  });

  return NextResponse.json({
    success: true,
    message: "TOTP 2FA enabled successfully",
    backupCodes: returnedBackupCodes,
  });
});
