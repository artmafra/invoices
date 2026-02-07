import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import type { StepUpAuthResponse } from "@/types/auth/step-up-auth.types";
import { withErrorHandler } from "@/lib/api-handler";
import { auth, generateSessionUpdateToken, verifyAndConsumeToken } from "@/lib/auth";
import { fromZodError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { checkRateLimit, constantTimeDelay } from "@/lib/rate-limit";
import { userService } from "@/services/runtime/user";
import { stepUpAuthSchema } from "@/validations/step-up-auth.validations";

/**
 * POST /api/auth/step-up
 *
 * Verifies step-up authentication using password or passkey.
 * Returns a timestamp that should be stored in the session.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const body = await request.json();

  let validatedData;
  try {
    validatedData = stepUpAuthSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  // Rate limit step-up attempts by user ID
  const rateLimitResult = await checkRateLimit("stepUpAuth", session.user.id);
  if (rateLimitResult && !rateLimitResult.success) {
    await constantTimeDelay(100, 200);
    throw new ValidationError("Too many attempts. Please try again later.");
  }

  let isVerified = false;

  if (validatedData.method === "password") {
    // Verify password
    isVerified = await userService.verifyPasswordById(session.user.id, validatedData.password);
  } else if (validatedData.method === "passkey") {
    // Verify the passkey verification token from /api/auth/passkey/authenticate/verify
    // This token proves that WebAuthn authentication actually happened server-side
    const tokenData = await verifyAndConsumeToken(
      validatedData.passkeyVerificationToken,
      "passkey-step-up-verify",
      session.user.id,
    );

    if (tokenData) {
      // Token is valid and belongs to the current user
      isVerified = true;
    }
  }

  if (!isVerified) {
    // Add constant delay to prevent timing attacks
    await constantTimeDelay(100, 200);
    throw new ValidationError("Invalid credentials");
  }

  const stepUpAuthAt = Date.now();

  // Generate secure token for session update
  // This prevents clients from forging step-up auth timestamps
  const stepUpToken = await generateSessionUpdateToken({
    type: "step-up",
    userId: session.user.id,
    payload: { stepUpAuthAt },
  });

  const response: StepUpAuthResponse = {
    success: true,
    stepUpAuthAt,
    stepUpToken, // Client must pass this to session.update()
  };

  return NextResponse.json(response);
});
