import { NextRequest, NextResponse } from "next/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { fromZodError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { passkeyService } from "@/services/runtime/passkey";
import { verifyPasskeyRegistrationSchema } from "@/validations/passkey.validations";

// Verify registration and save passkey
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit sensitive operations
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();

  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for adding a passkey
  requireStepUpAuth(session);

  const body = await request.json().catch(() => ({}));

  let validatedData;
  try {
    validatedData = verifyPasskeyRegistrationSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  const { response, deviceName } = validatedData;

  const passkey = await passkeyService.verifyRegistration(
    session.user.id,
    response as RegistrationResponseJSON,
    deviceName,
  );

  // Log activity
  await activityService.logAction(session, "add_passkey", "users", {
    type: "user",
    id: session.user.id,
    name: session.user.name || session.user.email || undefined,
  });

  return NextResponse.json({
    success: true,
    passkey,
  });
});
