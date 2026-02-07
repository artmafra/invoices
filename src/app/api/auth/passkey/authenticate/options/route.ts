import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api-handler";
import { fromZodError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { passkeyService } from "@/services/runtime/passkey";
import { generateAuthenticationOptionsSchema } from "@/validations/passkey.validations";

// Generate authentication options for passkey login
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));

  let validatedData;
  try {
    validatedData = generateAuthenticationOptionsSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  const { email } = validatedData;

  // Rate limit by IP + email combo (same as password auth)
  const ip = getClientIp(request);
  const rateLimitKey = email ? `${ip}:${email.toLowerCase()}` : ip;
  const rateLimitResponse = await withRateLimit("auth", rateLimitKey);
  if (rateLimitResponse) return rateLimitResponse;

  const options = await passkeyService.generateAuthenticationOptions(email);

  return NextResponse.json(options);
});
