import { NextRequest, NextResponse } from "next/server";
import type { UserEmail } from "@/schema/user-emails.schema";
import { z } from "zod/v4";
import type { UserEmailResponse } from "@/types/users/user-emails.types";
import { parseBody, withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import {
  ForbiddenError,
  fromZodError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { activityService } from "@/services/runtime/activity";
import { userEmailService } from "@/services/runtime/user-email";
import { emailIdParamSchema, verifyUserEmailSchema } from "@/validations/profile.validations";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Transform UserEmail to API response format
 */
function toUserEmailResponse(email: UserEmail): UserEmailResponse {
  return {
    id: email.id,
    email: email.email,
    isPrimary: email.isPrimary,
    isVerified: email.verifiedAt !== null,
    verifiedAt: email.verifiedAt?.toISOString() ?? null,
    createdAt: email.createdAt.toISOString(),
  };
}

/**
 * POST /api/profile/emails/[id]/verify
 * Send verification code to an email address
 */
export const POST = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  // Rate limit (strict - 1 per 30 seconds to prevent spam)
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("twoFactorResend", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const { id } = emailIdParamSchema.parse(await context.params);
  const acceptLanguage = request.headers.get("accept-language");

  // Get email to verify ownership
  const userEmail = await userEmailService.getEmailById(id);
  if (!userEmail) {
    throw new NotFoundError("Email");
  }

  if (userEmail.userId !== session.user.id) {
    throw new ForbiddenError("Cannot send verification for email belonging to another user");
  }

  // Already verified
  if (userEmail.verifiedAt) {
    throw new ValidationError("Email is already verified", "EMAIL_ALREADY_VERIFIED");
  }

  const success = await userEmailService.sendVerificationCode(
    session.user.id,
    userEmail,
    acceptLanguage,
  );

  if (!success) {
    throw new ValidationError("Failed to send verification code", "SEND_CODE_FAILED");
  }

  return NextResponse.json({
    success: true,
    message: "Verification code sent",
    email: userEmail.email,
  });
});

/**
 * PUT /api/profile/emails/[id]/verify
 * Verify an email address with a code
 */
export const PUT = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  // Rate limit (verification attempts)
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("twoFactorVerify", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const { id } = emailIdParamSchema.parse(await context.params);

  let data;
  try {
    data = await parseBody(request, verifyUserEmailSchema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  // Get email to verify ownership
  const userEmail = await userEmailService.getEmailById(id);
  if (!userEmail) {
    throw new NotFoundError("Email");
  }

  if (userEmail.userId !== session.user.id) {
    throw new ForbiddenError("Cannot verify email belonging to another user");
  }

  // Already verified
  if (userEmail.verifiedAt) {
    throw new ValidationError("Email is already verified", "EMAIL_ALREADY_VERIFIED");
  }

  const result = await userEmailService.verifyEmail(session.user.id, id, data.code);

  if (!result) {
    throw new ValidationError("Invalid or expired verification code", "INVALID_CODE");
  }

  // Log activity
  await activityService.logUpdate(
    session,
    "user_emails",
    { type: "email", id: result.id, name: result.email },
    [{ field: "verified", from: "false", to: "true" }],
  );

  return NextResponse.json({
    email: toUserEmailResponse(result),
    message: "Email verified successfully",
  });
});
