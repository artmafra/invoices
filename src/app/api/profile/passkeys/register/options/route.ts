import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { passkeyService } from "@/services/runtime/passkey";

// Generate registration options for passkey setup
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit by IP
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("default", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for adding a passkey
  requireStepUpAuth(session);

  const options = await passkeyService.generateRegistrationOptions(
    session.user.id,
    session.user.email,
    session.user.name ?? undefined,
  );

  return NextResponse.json(options);
});
