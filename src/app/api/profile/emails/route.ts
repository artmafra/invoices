import { NextRequest, NextResponse } from "next/server";
import { UserEmailDTO } from "@/dtos/user-email.dto";
import type { UserEmail } from "@/schema/user-emails.schema";
import { z } from "zod/v4";
import { parseBody, withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { fromZodError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { userEmailService } from "@/services/runtime/user-email";
import { addUserEmailSchema } from "@/validations/profile.validations";

/**
 * Transform UserEmail to API response format
 */
function toUserEmailResponse(email: UserEmail) {
  return UserEmailDTO.toResponse(email);
}

/**
 * GET /api/profile/emails
 * List all email addresses for the current user
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  // Rate limit
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("default", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const response = await userEmailService.getUserEmails(session.user.id);

  return NextResponse.json(response);
});

/**
 * POST /api/profile/emails
 * Add a new email address (requires step-up auth)
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  // Rate limit (sensitive action - sends email)
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for adding new email
  requireStepUpAuth(session);

  let data;
  try {
    data = await parseBody(request, addUserEmailSchema);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw fromZodError(error);
    }
    throw error;
  }

  const { email } = data;
  const acceptLanguage = request.headers.get("accept-language");

  // Check if user already has this email
  const existingEmails = await userEmailService.getUserEmails(session.user.id);
  const alreadyHasEmail = existingEmails.emails.some(
    (e) => e.email.toLowerCase() === email.toLowerCase(),
  );
  if (alreadyHasEmail) {
    throw new ValidationError("You already have this email address", "EMAIL_ALREADY_ADDED");
  }

  try {
    const result = await userEmailService.addEmail(session.user.id, email, acceptLanguage);

    // Log activity
    await activityService.logCreate(session, "user_emails", {
      type: "email",
      id: result.userEmail.id,
      name: result.userEmail.email,
    });

    return NextResponse.json({
      email: toUserEmailResponse(result.userEmail),
      codeSent: result.codeSent,
      message: result.codeSent
        ? "Verification code sent to the email address"
        : "Email added but verification code could not be sent",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Email address is already in use") {
      throw new ValidationError(
        "Email address is already in use by another account",
        "EMAIL_IN_USE",
      );
    }
    throw error;
  }
});
