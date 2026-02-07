import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { UnauthorizedError, ValidationError } from "@/lib/errors";
import { verifyPending2faToken } from "@/lib/pending-2fa-token";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/auth/pending-2fa
 *
 * Decrypts a pending 2FA token and returns the userId, email, and availableMethods.
 * This endpoint is called by the login page after receiving a 2FA_REQUIRED error
 * from the credentials provider.
 *
 * The token is encrypted with AES-256-GCM and contains an expiry timestamp,
 * making this a fully stateless 2FA flow without database storage.
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP to prevent token enumeration
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("twoFactorVerify", ip);
  if (rateLimitResult) return rateLimitResult;

  const { token } = await request.json();

  if (!token || typeof token !== "string") {
    throw new ValidationError("Token is required");
  }

  try {
    const data = verifyPending2faToken(token);

    return NextResponse.json({
      success: true,
      userId: data.userId,
      email: data.email,
      availableMethods: data.availableMethods,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Token has expired") {
      throw new UnauthorizedError("Session has expired. Please try logging in again.");
    }
    throw new UnauthorizedError("Invalid token. Please try logging in again.");
  }
});
