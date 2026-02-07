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
 * DELETE /api/profile/emails/[id]
 * Remove an email address (requires step-up auth)
 */
export const DELETE = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  // Rate limit (sensitive action)
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up auth for removing email
  requireStepUpAuth(session);

  const { id } = emailIdParamSchema.parse(await context.params);

  // Get email to verify ownership and log activity
  const userEmail = await userEmailService.getEmailById(id);
  if (!userEmail) {
    throw new NotFoundError("Email");
  }

  if (userEmail.userId !== session.user.id) {
    throw new ForbiddenError("Cannot delete email belonging to another user");
  }

  try {
    await userEmailService.removeEmail(session.user.id, id);

    // Log activity
    await activityService.logDelete(session, "user_emails", {
      type: "email",
      id: userEmail.id,
      name: userEmail.email,
    });

    return NextResponse.json({
      success: true,
      message: "Email removed successfully",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Cannot remove primary email address") {
        throw new ValidationError("Cannot remove primary email address", "CANNOT_REMOVE_PRIMARY");
      }
      if (error.message === "Cannot remove the only email address") {
        throw new ValidationError(
          "Cannot remove your only email address",
          "CANNOT_REMOVE_ONLY_EMAIL",
        );
      }
    }
    throw error;
  }
});

/**
 * GET /api/profile/emails/[id]
 * Get a specific email address
 */
export const GET = withErrorHandler(async (request: NextRequest, context: RouteParams) => {
  // Rate limit
  const ip = getClientIp(request);
  const rateLimitResponse = await withRateLimit("default", ip);
  if (rateLimitResponse) return rateLimitResponse;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  const { id } = emailIdParamSchema.parse(await context.params);

  const userEmail = await userEmailService.getEmailById(id);
  if (!userEmail) {
    throw new NotFoundError("Email");
  }

  if (userEmail.userId !== session.user.id) {
    throw new ForbiddenError("Cannot view email belonging to another user");
  }

  return NextResponse.json({
    email: toUserEmailResponse(userEmail),
  });
});
