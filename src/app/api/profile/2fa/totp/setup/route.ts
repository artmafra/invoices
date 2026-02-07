import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { twoFactorService } from "@/services/runtime/two-factor";

// Generate TOTP setup data (QR code, secret)
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("default", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for TOTP setup
  requireStepUpAuth(session);

  // Generate TOTP setup data
  const setupData = await twoFactorService.totpGenerateSetupData(session.user.email);

  return NextResponse.json(setupData);
});
