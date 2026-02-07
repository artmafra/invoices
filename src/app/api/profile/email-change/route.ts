import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import {
  fromZodError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { emailChangeService } from "@/services/runtime/email-change";
import { userService } from "@/services/runtime/user";
import {
  requestEmailChangeSchema,
  verifyEmailChangeSchema,
} from "@/validations/profile.validations";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit email change requests (prevents spam)
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for initiating email change
  requireStepUpAuth(session);

  const body = await request.json();

  let data;
  try {
    data = requestEmailChangeSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  const { newEmail } = data;

  // Get the current email from the database (not session) to handle recent email changes
  const currentUser = await userService.getUserById(session.user.id);
  if (!currentUser) {
    throw new NotFoundError("User");
  }

  // Check if the new email is different from the current one
  if (newEmail.toLowerCase() === currentUser.email.toLowerCase()) {
    throw new ValidationError("New email must be different from current email", "SAME_EMAIL");
  }

  const success = await emailChangeService.generateAndSendCode(session.user.id, newEmail);

  if (!success) {
    throw new InternalServerError("Failed to send verification email");
  }

  return NextResponse.json({
    success: true,
    message: "Verification code sent to new email address",
    email: newEmail,
  });
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  // Rate limit verification attempts
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("twoFactorVerify", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // SECURITY: Require step-up auth for email change verification
  // This prevents an attacker who intercepted the code from completing the change
  requireStepUpAuth(session);

  const body = await request.json();

  let data;
  try {
    data = verifyEmailChangeSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  const { code } = data;

  // Pass current session ID to keep it active while revoking others
  const result = await emailChangeService.verifyCodeAndUpdateEmail(
    session.user.id,
    code,
    session.user.sessionId,
  );

  if (!result) {
    throw new ValidationError("Invalid or expired verification code", "INVALID_VERIFICATION_CODE");
  }

  // Log activity with old and new email
  await activityService.logUpdate(
    session,
    "users",
    {
      type: "user",
      id: session.user.id,
      name: session.user.name || session.user.email || undefined,
    },
    [{ field: "email", from: result.oldEmail, to: result.newEmail }],
  );

  return NextResponse.json({
    success: true,
    message: "Email address updated successfully",
  });
});

export const DELETE = withErrorHandler(async (_request: NextRequest) => {
  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  await emailChangeService.cancelEmailChange(session.user.id);

  return NextResponse.json({
    success: true,
    message: "Email change request cancelled",
  });
});
