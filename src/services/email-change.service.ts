import { JobPriority } from "@/types/common/queue.types";
import { siteConfig } from "@/config/site.config";
import { ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { userStorage } from "@/storage/runtime/user";
import type { EmailQueueService } from "@/services/email-queue.service";
import type { TokenService } from "@/services/token.service";
import type { UserSessionService } from "@/services/user-session.service";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { SecurityAlertEmail } from "@/emails/security-alert";
import { VerifyEmailEmail } from "@/emails/verify-email";

export class EmailChangeService {
  private emailQueueService: EmailQueueService;
  private tokenService: TokenService;
  private userSessionService: UserSessionService;

  constructor(
    emailQueueService: EmailQueueService,
    tokenService: TokenService,
    userSessionService: UserSessionService,
  ) {
    this.emailQueueService = emailQueueService;
    this.tokenService = tokenService;
    this.userSessionService = userSessionService;
  }

  /**
   * Send security alert email to old email address when email is changed
   */
  private async sendEmailChangedAlert(
    oldEmail: string,
    newEmail: string,
    userName?: string,
    userLocale?: string | null,
    acceptLanguage?: string | null,
  ): Promise<void> {
    try {
      // Resolve locale and load translations
      const locale = await resolveEmailLocale({ userLocale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      await this.emailQueueService.enqueueEmail({
        to: oldEmail,
        subject: t.security.emailChanged.subject,
        template: SecurityAlertEmail({
          alertType: "email-changed",
          userName,
          changedAt: new Date().toLocaleString(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          }),
          additionalInfo: `New email: ${newEmail}`,
          websiteName: siteConfig.name,
          t: t.security,
          tCommon: t.common,
        }),
        templateName: "security-alert",
        priority: JobPriority.HIGH,
      });
    } catch (error) {
      logger.error({ error, oldEmail, newEmail, userName }, "Failed to send email changed alert");
    }
  }

  /**
   * Generate and send an email change verification code
   * @throws {ConflictError} When email address is already in use by another account
   */
  async generateAndSendCode(
    userId: string,
    newEmail: string,
    acceptLanguage?: string | null,
  ): Promise<boolean> {
    try {
      // Check if the new email is already in use
      const existingUser = await userStorage.findByEmail(newEmail);

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError(
          "Email address is already in use by another account",
          "EMAIL_IN_USE",
        );
      }

      // Get user for locale
      const user = await userStorage.findById(userId);

      // Create token (cleans up existing unused tokens automatically)
      const { rawCode } = await this.tokenService.createEmailChangeToken(userId, newEmail);

      // Resolve locale and load translations
      const locale = await resolveEmailLocale({ userLocale: user?.locale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      // Send the code via email to the NEW email address
      await this.emailQueueService.enqueueEmail({
        to: newEmail,
        subject: t.emailChange.subject,
        template: VerifyEmailEmail({
          code: rawCode,
          email: newEmail,
          websiteName: siteConfig.name,
          t: t.emailChange,
          tCommon: t.common,
        }),
        templateName: "verify-email",
        priority: JobPriority.CRITICAL,
      });

      return true;
    } catch (error) {
      logger.error({ error, userId, newEmail }, "Error generating/sending email change code");
      return false;
    }
  }

  /**
   * Verify the code and update the user's email
   * @param userId User ID
   * @param code Verification code
   * @param currentSessionId Optional session ID to keep (revoke all others)
   * @param acceptLanguage Accept-Language header for email locale
   * @returns The old and new email on success, null on failure
   * @throws {ConflictError} When email address is no longer available
   */
  async verifyCodeAndUpdateEmail(
    userId: string,
    code: string,
    currentSessionId?: string,
    acceptLanguage?: string | null,
  ): Promise<{ oldEmail: string; newEmail: string } | null> {
    try {
      // Find valid, unused token
      const result = await this.tokenService.validateEmailChangeCode(userId, code);

      if (!result) {
        return null;
      }

      const { token, request } = result;

      // Check if the new email is still available
      const existingUser = await userStorage.findByEmail(request.newEmail);

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictError("Email address is no longer available", "EMAIL_IN_USE");
      }

      // Get the current email and user name before updating
      const currentUser = await userStorage.findById(userId);
      const oldEmail = currentUser?.email ?? "";
      const userName = currentUser?.name ?? undefined;
      const userLocale = currentUser?.locale;

      // Update the user's email
      await userStorage.update(userId, {
        email: request.newEmail,
        emailVerified: new Date(),
      });

      // Mark token as used
      await this.tokenService.markEmailChangeUsed(token.id);

      // SECURITY: Revoke all other sessions after email change
      // Keep the current session so user doesn't get logged out
      const revokedCount = await this.userSessionService.revokeAllUserSessions(
        userId,
        currentSessionId,
      );
      if (revokedCount > 0) {
        logger.info(
          { userId, revokedCount, currentSessionId },
          "Email change: revoked other sessions",
        );
      }

      // Send security alert to OLD email address (async, don't block)
      if (oldEmail) {
        this.sendEmailChangedAlert(
          oldEmail,
          request.newEmail,
          userName,
          userLocale,
          acceptLanguage,
        );
      }

      return { oldEmail, newEmail: request.newEmail };
    } catch (error) {
      logger.error({ error, userId, code }, "Error verifying email change code");
      return null;
    }
  }

  /**
   * Cancel an email change request
   */
  async cancelEmailChange(_userId: string): Promise<void> {
    // Note: This will be cleaned up by the cleanup job
    // Individual user token deletion would require the TokenStorage directly
    await this.tokenService.cleanupExpiredTokensByType("email_change");
  }
}
