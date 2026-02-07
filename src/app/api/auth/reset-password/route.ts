import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { ValidationError } from "@/lib/errors";
import { validatePasswordServer } from "@/lib/password-policy.server";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { activityService } from "@/services/runtime/activity";
import { passwordResetService } from "@/services/runtime/password-reset";
import { resetPasswordSchema, validateResetTokenSchema } from "@/validations/auth.validations";

// GET - Validate token
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Rate limit token validation by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("tokenValidation", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const result = validateResetTokenSchema.safeParse({ token });
  if (!result.success) {
    return NextResponse.json(
      { valid: false, error: result.error.issues[0].message },
      { status: 400 },
    );
  }

  const validation = await passwordResetService.validateToken(result.data.token);

  if (!validation.valid) {
    return NextResponse.json(
      { valid: false, error: "Invalid or expired reset link" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    valid: true,
    email: validation.email,
  });
});

// POST - Reset password
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("tokenValidation", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json();

  // Validate input
  const result = resetPasswordSchema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0].message);
  }

  const { token, password } = result.data;

  // Validate password against policy
  const passwordValidation = await validatePasswordServer(password);
  if (!passwordValidation.valid) {
    const firstError = passwordValidation.errors[0];
    throw new ValidationError(
      firstError?.key ?? "validation.passwordRequirements",
      firstError?.params,
    );
  }

  // Reset password
  const { userId, userName } = await passwordResetService.resetPassword(token, password);

  // Log activity
  await activityService.logAction(userId, "reset_password", "users", {
    type: "user",
    id: userId,
    name: userName,
  });

  return NextResponse.json({
    message: "Password has been reset successfully. You can now sign in with your new password.",
  });
});
