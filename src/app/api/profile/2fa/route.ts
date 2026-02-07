import { NextRequest, NextResponse } from "next/server";
import type { TwoFactorStatusResponse } from "@/types/auth/auth.types";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { twoFactorService } from "@/services/runtime/two-factor";

// Get 2FA status for current user
export const GET = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const methods = await twoFactorService.getAvailableMethods(session.user.id);
  const backupCodesCount = await twoFactorService.backupGetRemainingCount(session.user.id);

  const response: TwoFactorStatusResponse = {
    enabled: methods.hasAny,
    methods: {
      email: methods.email,
      totp: methods.totp,
    },
    preferred: methods.preferred,
    backupCodesCount,
  };

  return NextResponse.json(response);
});
