import { NextRequest, NextResponse } from "next/server";
import { JobPriority } from "@/types/common/queue.types";
import { siteConfig } from "@/config/site.config";
import { withErrorHandler } from "@/lib/api-handler";
import { auth } from "@/lib/auth";
import { ConflictError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { getClientIp, withRateLimit } from "@/lib/rate-limit";
import { requireStepUpAuth } from "@/lib/step-up-auth";
import { accountService } from "@/services/runtime/account";
import { activityService } from "@/services/runtime/activity";
import { emailQueueService } from "@/services/runtime/email-queue";
import { userService } from "@/services/runtime/user";
import { linkGoogleAccountSchema } from "@/validations/profile.validations";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { SecurityAlertEmail } from "@/emails/security-alert";

/**
 * Send security alert email for Google account changes
 */
async function sendGoogleSecurityAlert(
  userId: string,
  alertType: "google-linked" | "google-unlinked",
  googleEmail?: string,
  acceptLanguage?: string | null,
): Promise<void> {
  try {
    const user = await userService.getUserById(userId);
    if (!user?.email) return;

    // Resolve locale and load translations
    const locale = await resolveEmailLocale({ userLocale: user.locale, acceptLanguage });
    const t = await getEmailTranslations(locale);

    const translationKey = alertType === "google-linked" ? "googleLinked" : "googleUnlinked";
    const alertTranslation = t.security[translationKey];

    await emailQueueService.enqueueEmail({
      to: user.email,
      subject: alertTranslation.subject,
      template: SecurityAlertEmail({
        alertType,
        userName: user.name ?? undefined,
        changedAt: new Date().toLocaleString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }),
        additionalInfo: googleEmail ? `Google account: ${googleEmail}` : undefined,
        websiteName: siteConfig.name,
        t: t.security,
        tCommon: t.common,
      }),
      templateName: "security-alert",
      priority: JobPriority.HIGH,
    });
  } catch (error) {
    console.error("Failed to send Google security alert email:", error);
  }
}

export const POST = withErrorHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const rateLimitResult = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up authentication
  requireStepUpAuth(session);

  const body = await req.json();
  const validatedData = linkGoogleAccountSchema.parse(body);

  const { googleId, email, name, picture, accessToken } = validatedData;

  if (!googleId) {
    throw new ValidationError("Google account ID is required", "GOOGLE_ID_REQUIRED");
  }

  // Check if this Google account is already linked to another user
  const isLinkedToOther = await accountService.isProviderLinkedToOtherUser(
    "google",
    googleId,
    session.user.id,
  );

  if (isLinkedToOther) {
    throw new ConflictError(
      "This Google account is already linked to another user",
      "GOOGLE_LINKED_TO_OTHER",
    );
  }

  // Check if user already has a Google account linked
  const hasGoogleAccount = await accountService.hasProviderLinked(session.user.id, "google");

  if (hasGoogleAccount) {
    throw new ConflictError(
      "A Google account is already linked to your account",
      "GOOGLE_ALREADY_LINKED",
    );
  }

  // Link the Google account
  await accountService.createAccount({
    userId: session.user.id,
    type: "oauth",
    provider: "google",
    providerAccountId: googleId,
    access_token: accessToken || null,
  });

  // Touch user to update updatedAt timestamp for profile cache invalidation
  await userService.touchUser(session.user.id);

  // Log activity
  await activityService.logAction(
    session,
    "link_google",
    "users",
    {
      type: "user",
      id: session.user.id,
      name: session.user.name || session.user.email || undefined,
    },
    { metadata: { googleEmail: email } },
  );

  // Send security alert email (async, don't block response)
  const acceptLanguage = req.headers.get("Accept-Language");
  sendGoogleSecurityAlert(session.user.id, "google-linked", email, acceptLanguage);

  return NextResponse.json({
    success: true,
    account: { email, name, picture },
  });
});

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("sensitiveAction", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Require step-up authentication
  requireStepUpAuth(session);

  // Remove the Google account link
  await accountService.deleteAccountByUserAndProvider(session.user.id, "google");

  // Touch user to update updatedAt timestamp for profile cache invalidation
  await userService.touchUser(session.user.id);

  // Log activity
  await activityService.logAction(session, "unlink_google", "users", {
    type: "user",
    id: session.user.id,
    name: session.user.name || session.user.email || undefined,
  });

  // Send security alert email (async, don't block response)
  const acceptLanguage = request.headers.get("Accept-Language");
  sendGoogleSecurityAlert(session.user.id, "google-unlinked", undefined, acceptLanguage);

  return NextResponse.json({ success: true });
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rateLimitResult = await withRateLimit("default", ip);
  if (rateLimitResult) return rateLimitResult;

  const session = await auth();
  if (!session?.user?.id) {
    throw new UnauthorizedError();
  }

  // Check if user has a Google account linked
  const googleAccount = await accountService.getAccountByUserAndProvider(session.user.id, "google");

  return NextResponse.json({
    isLinked: !!googleAccount,
    account: googleAccount
      ? {
          providerAccountId: googleAccount.providerAccountId,
        }
      : null,
  });
});
