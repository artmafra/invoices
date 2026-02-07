import { NextRequest, NextResponse } from "next/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api-handler";
import { generateSessionUpdateToken } from "@/lib/auth";
import { fromZodError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { passkeyService } from "@/services/runtime/passkey";
import { verifyPasskeyAuthenticationSchema } from "@/validations/passkey.validations";

// Verify passkey authentication
// This endpoint returns a userId that can be used with NextAuth signIn
// When purpose=step-up, it also returns a verification token for the step-up endpoint
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP (we don't have email at this point)
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("auth", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));

  let validatedData;
  try {
    validatedData = verifyPasskeyAuthenticationSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  const { response, purpose } = validatedData;

  const userId = await passkeyService.verifyAuthentication(response as AuthenticationResponseJSON);

  // Generate a verification token that proves the passkey was actually verified server-side
  // This token is REQUIRED for NextAuth sign-in to prevent bypass attacks
  const tokenType = purpose === "step-up" ? "passkey-step-up-verify" : "passkey-sign-in";
  const passkeyVerificationToken = await generateSessionUpdateToken({
    type: tokenType as "passkey-step-up-verify" | "passkey-sign-in",
    userId, // The user who owns the passkey
    payload: { authenticatedAt: Date.now() },
  });

  // Return the userId and token - the client will use both to sign in via NextAuth
  return NextResponse.json({
    success: { code: "auth.passkey.authenticate.verified" },
    userId,
    passkeyVerificationToken,
  });
});
