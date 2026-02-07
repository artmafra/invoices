import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { InternalServerError, ValidationError } from "@/lib/errors";
import { withRateLimit } from "@/lib/rate-limit";
import { isValidUUID } from "@/lib/uuid";
import { twoFactorService } from "@/services/runtime/two-factor";
import { userService } from "@/services/runtime/user";
import { resend2faSchema } from "@/validations/2fa.validations";

// Resend 2FA verification code during login
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = resend2faSchema.parse(body);

  const { userId } = validatedData;

  if (!userId) {
    throw new ValidationError("User ID is required");
  }

  // Strict rate limit: 1 request per 30 seconds per user
  const rateLimitResponse = await withRateLimit("twoFactorResend", userId);
  if (rateLimitResponse) return rateLimitResponse;

  // Validate UUID format - return success for invalid UUIDs (anti-enumeration)
  if (!isValidUUID(userId)) {
    return NextResponse.json({ success: true });
  }

  // Get user details
  const user = await userService.getUserById(userId);

  // Anti-enumeration: Return success even if user doesn't exist
  // This prevents attackers from discovering valid user IDs
  if (!user || !user.isActive) {
    return NextResponse.json({ success: true });
  }

  // Check if 2FA is enabled
  const twoFactorEnabled = await twoFactorService.isEnabled(userId);

  if (!twoFactorEnabled) {
    // Return success to avoid revealing 2FA status
    return NextResponse.json({ success: true });
  }

  // Generate and send new code
  const codeSent = await twoFactorService.emailSendCode(userId, user.email);

  if (!codeSent) {
    throw new InternalServerError("Failed to send verification code. Please try again later.");
  }

  return NextResponse.json({ success: true });
});
