import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { ConflictError, InternalServerError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { twoFactorService } from "@/services/runtime/two-factor";

// Send verification code to setup email 2FA
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit code sending to prevent spam
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("twoFactorResend", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    throw new UnauthorizedError();
  }

  // Check if email 2FA is already enabled
  const isEmailEnabled = await twoFactorService.emailIsEnabled(session.user.id);
  if (isEmailEnabled) {
    throw new ConflictError(
      "Email verification codes already configured",
      "EMAIL_2FA_ALREADY_ENABLED",
    );
  }

  // Send verification code
  const success = await twoFactorService.emailSendCode(session.user.id, session.user.email);

  if (!success) {
    throw new InternalServerError("Failed to send verification code");
  }

  return NextResponse.json({
    success: true,
    message: "Verification code sent to your email",
  });
});
