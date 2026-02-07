import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ValidationError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { passwordResetService } from "@/services/runtime/password-reset";
import { forgotPasswordSchema } from "@/validations/auth.validations";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP to prevent email spam
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("passwordReset", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json();

  // Validate input
  const result = forgotPasswordSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  const { email } = result.data;

  // Request password reset (always completes to prevent email enumeration)
  await passwordResetService.requestPasswordReset(email);

  // Always return success to prevent email enumeration
  return NextResponse.json({
    message: "If an account with that email exists, we've sent a password reset link.",
  });
});
