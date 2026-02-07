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
import { twoFactorService } from "@/services/runtime/two-factor";
import { userService } from "@/services/runtime/user";
import { verifyEmailSchema } from "@/validations/profile.validations";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("twoFactorResend", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Get the user's current email from the database
  const currentUser = await userService.getUserById(session.user.id);
  if (!currentUser) {
    throw new NotFoundError("User not found");
  }

  // Check if email is already verified
  if (currentUser.emailVerified) {
    throw new ValidationError("Email is already verified", "EMAIL_ALREADY_VERIFIED");
  }

  const success = await twoFactorService.emailSendCode(session.user.id, currentUser.email);

  if (!success) {
    throw new InternalServerError("Failed to send verification email");
  }

  return NextResponse.json({
    success: true,
    message: "Verification code sent to your email address",
    email: currentUser.email,
  });
});

export const PUT = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("twoFactorVerify", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const body = await request.json();

  let validatedData;
  try {
    validatedData = verifyEmailSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  const { code } = validatedData;

  // Verify the code using the 2FA service
  const success = await twoFactorService.verifyCode(session.user.id, code);

  if (!success) {
    throw new ValidationError("Invalid or expired verification code", "INVALID_VERIFICATION_CODE");
  }

  // Update the user's emailVerified field
  await userService.updateUser(session.user.id, {
    emailVerified: new Date(),
  });

  return NextResponse.json({
    success: true,
    message: "Email verified successfully",
  });
});
