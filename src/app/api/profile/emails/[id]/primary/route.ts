import { NextRequest, NextResponse } from "next/server";
import type { UserEmail } from "@/schema/user-emails.schema";
import type { UserEmailResponse } from "@/types/users/user-emails.types";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { activityService } from "@/services/runtime/activity";
import { userEmailService } from "@/services/runtime/user-email";
import { emailIdParamSchema } from "@/validations/profile.validations";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Transform UserEmail to API response format
 */
function toUserEmailResponse(email: UserEmail): UserEmailResponse {
  return {
    id: email.id,
    email: email.email,
    isPrimary: email.isPrimary,
    isVerified: email.verifiedAt !== null,
    verifiedAt: email.verifiedAt?.toISOString() ?? null,
    createdAt: email.createdAt.toISOString(),
  };
}

/**
 * PATCH /api/profile/emails/[id]/primary
 * Set an email address as primary (requires step-up auth)
 */
export const PATCH = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  // Rate limit (sensitive action)
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for changing primary email
  requireStepUpAuth(session);

  const { id } = emailIdParamSchema.parse(await context.params);
  const acceptLanguage = request.headers.get("accept-language");

  // Get email to verify ownership
  const userEmail = await userEmailService.getEmailById(id);
  if (!userEmail) {
    throw new NotFoundError("Email");
  }

  if (userEmail.userId !== session.user.id) {
    throw new ForbiddenError("Cannot modify email belonging to another user");
  }

  // Get old primary email for activity log
  const oldPrimary = await userEmailService.getPrimaryEmail(session.user.id);

  try {
    const result = await userEmailService.setPrimaryEmail(
      session.user.id,
      id,
      acceptLanguage,
      session.sessionId,
    );

    if (!result) {
      throw new NotFoundError("Email");
    }

    // Log activity
    if (oldPrimary && oldPrimary.id !== id) {
      await activityService.logUpdate(
        session,
        "user_emails",
        { type: "email", id: result.id, name: result.email },
        [{ field: "primary_email", from: oldPrimary.email, to: result.email }],
      );
    }

    return NextResponse.json({
      email: toUserEmailResponse(result),
      message: "Primary email updated successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Email must be verified before setting as primary") {
        throw new ValidationError(
          "Email must be verified before setting as primary",
          "EMAIL_NOT_VERIFIED",
        );
      }
    }
    throw error;
  }
});
