import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { ConflictError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { twoFactorService } from "@/services/runtime/two-factor";

// Verify code and enable email 2FA
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

  const { code } = await request.json();

  if (!code || typeof code !== "string") {
    throw new ValidationError("Verification code is required", "CODE_REQUIRED");
  }

  // Check if email 2FA is already enabled
  const isEmailEnabled = await twoFactorService.emailIsEnabled(session.user.id);
  if (isEmailEnabled) {
    throw new ConflictError(
      "Email verification codes already configured",
      "EMAIL_2FA_ALREADY_ENABLED",
    );
  }

  // Verify the code
  const isValid = await twoFactorService.emailVerifyCode(session.user.id, code);

  if (!isValid) {
    throw new ValidationError("Invalid or expired verification code", "INVALID_2FA_CODE");
  }

  // Enable email 2FA
  await twoFactorService.emailEnable(session.user.id);

  // Log activity
  await activityService.logAction(session, "enable_2fa_email", "users", {
    type: "user",
    id: session.user.id,
    name: session.user.name || session.user.email || undefined,
  });

  return NextResponse.json({
    success: true,
    message: "Email 2FA enabled successfully",
  });
});
