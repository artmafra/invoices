import { UserEmailDTO } from "@/dtos/user-email.dto";
import type { UserEmail } from "@/schema/user-emails.schema";
import { JobPriority } from "@/types/common/queue.types";
import type { UserEmailsListResponse } from "@/types/users/user-emails.types";
import { siteConfig } from "@/config/site.config";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { userStorage } from "@/storage/runtime/user";
import { userEmailStorage } from "@/storage/runtime/user-email";
import type { EmailQueueService } from "@/services/email-queue.service";
import type { TokenService } from "@/services/token.service";
import type { UserSessionService } from "@/services/user-session.service";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { SecurityAlertEmail } from "@/emails/security-alert";
import { VerifyEmailEmail } from "@/emails/verify-email";

export interface AddEmailResult {
  userEmail: UserEmail;
  codeSent: boolean;
}

export class UserEmailService {
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
   * Get all emails for a user
   */
  async getUserEmails(userId: string): Promise<UserEmailsListResponse> {
    const emails = await userEmailStorage.findAllByUserId(userId);
    return UserEmailDTO.toListResponse(emails);
  }

  /**
   * Get a specific email by ID
   */
  async getEmailById(id: string): Promise<UserEmail | null> {
    return (await userEmailStorage.findById(id)) ?? null;
  }

  /**
   * Add a new email address for a user.
   * Creates an unverified email record and sends a verification code.
   * @throws {ConflictError} When email address is already in use by another account
   */
  async addEmail(
    userId: string,
    email: string,
    acceptLanguage?: string | null,
  ): Promise<AddEmailResult> {
    const normalizedEmail = email.toLowerCase();

    // Check if email is already in use
    const existingEmail = await userEmailStorage.findByEmail(normalizedEmail);
    if (existingEmail) {
      throw new ConflictError("Email address is already in use by another account", "EMAIL_IN_USE");
    }

    // Create unverified email record
    const userEmail = await userEmailStorage.create({
      userId,
      email: normalizedEmail,
      isPrimary: false,
      verifiedAt: null,
    });

    // Send verification code
    const codeSent = await this.sendVerificationCode(userId, userEmail, acceptLanguage);

    return { userEmail, codeSent };
  }

  /**
   * Send or resend verification code for an email
   */
  async sendVerificationCode(
    userId: string,
    userEmail: UserEmail,
    acceptLanguage?: string | null,
  ): Promise<boolean> {
    try {
      // Get user for locale
      const user = await userStorage.findById(userId);

      // Create verification token
      const { rawCode } = await this.tokenService.createEmailVerificationToken(
        userId,
        userEmail.id,
      );

      // Resolve locale and load translations
      const locale = await resolveEmailLocale({ userLocale: user?.locale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      // Send verification email
      await this.emailQueueService.enqueueEmail({
        to: userEmail.email,
        subject: t.emailChange.subject,
        template: VerifyEmailEmail({
          code: rawCode,
          email: userEmail.email,
          websiteName: siteConfig.name,
          t: t.emailChange,
          tCommon: t.common,
        }),
        templateName: "verify-email",
        priority: JobPriority.CRITICAL,
      });

      return true;
    } catch (error) {
      console.error("Error sending email verification code:", error);
      return false;
    }
  }

  /**
   * Verify an email with a code
   */
  async verifyEmail(userId: string, userEmailId: string, code: string): Promise<UserEmail | null> {
    // Validate the code
    const token = await this.tokenService.validateEmailVerificationCode(userId, userEmailId, code);
    if (!token) {
      return null;
    }

    // Mark email as verified
    const verifiedEmail = await userEmailStorage.markVerified(userEmailId);
    if (!verifiedEmail) {
      return null;
    }

    // Mark token as used
    await this.tokenService.markEmailVerificationUsed(token.id);

    return verifiedEmail;
  }

  /**
   * Remove an email address.
   * Cannot remove primary email or the only email.
   * @throws {NotFoundError} When email does not exist
   * @throws {ForbiddenError} When email does not belong to user
   * @throws {ValidationError} When trying to remove primary or last email
   */
  async removeEmail(userId: string, userEmailId: string): Promise<boolean> {
    const userEmail = await userEmailStorage.findById(userEmailId);
    if (!userEmail) {
      throw new NotFoundError("Email", "EMAIL_NOT_FOUND");
    }

    // Verify ownership
    if (userEmail.userId !== userId) {
      throw new ForbiddenError("Email does not belong to this user", "EMAIL_OWNERSHIP_MISMATCH");
    }

    // Cannot remove primary email
    if (userEmail.isPrimary) {
      throw new ValidationError("Cannot remove primary email address", "PRIMARY_EMAIL_REMOVAL");
    }

    // Cannot remove the only email
    const emailCount = await userEmailStorage.countByUserId(userId);
    if (emailCount <= 1) {
      throw new ValidationError("Cannot remove the only email address", "LAST_EMAIL_REMOVAL");
    }

    return userEmailStorage.delete(userEmailId);
  }

  /**
   * Set an email as primary.
   * Email must be verified.
   * Sends security alert to old primary email.
   * @throws {NotFoundError} When email does not exist
   * @throws {ForbiddenError} When email does not belong to user
   * @throws {ValidationError} When email is not verified
   */
  async setPrimaryEmail(
    userId: string,
    userEmailId: string,
    acceptLanguage?: string | null,
    currentSessionId?: string,
  ): Promise<UserEmail | null> {
    const userEmail = await userEmailStorage.findById(userEmailId);
    if (!userEmail) {
      throw new NotFoundError("Email", "EMAIL_NOT_FOUND");
    }

    // Verify ownership
    if (userEmail.userId !== userId) {
      throw new ForbiddenError("Email does not belong to this user", "EMAIL_OWNERSHIP_MISMATCH");
    }

    // Email must be verified
    if (!userEmail.verifiedAt) {
      throw new ValidationError(
        "Email must be verified before setting as primary",
        "EMAIL_NOT_VERIFIED",
      );
    }

    // Already primary
    if (userEmail.isPrimary) {
      return userEmail;
    }

    // Get old primary email for notification
    const oldPrimary = await userEmailStorage.getPrimaryByUserId(userId);

    // Get user info for notifications
    const user = await userStorage.findById(userId);

    // Set as primary (this also syncs to users.email)
    const result = await userEmailStorage.setAsPrimary(userEmailId, userId);

    // SECURITY: Revoke all other sessions after primary email change
    // Keep the current session so user doesn't get logged out
    if (currentSessionId) {
      const revokedCount = await this.userSessionService.revokeAllUserSessions(
        userId,
        currentSessionId,
      );
      if (revokedCount > 0) {
        console.log(
          `Primary email change: revoked ${revokedCount} other session(s) for user ${userId}`,
        );
      }
    }

    // Send security alert to OLD primary email (async, don't block)
    if (oldPrimary && oldPrimary.email !== userEmail.email) {
      this.sendPrimaryEmailChangedAlert(
        oldPrimary.email,
        userEmail.email,
        user?.name ?? undefined,
        user?.locale,
        acceptLanguage,
      );
    }

    return result ?? null;
  }

  /**
   * Send security alert when primary email changes
   */
  private async sendPrimaryEmailChangedAlert(
    oldEmail: string,
    newEmail: string,
    userName?: string,
    userLocale?: string | null,
    acceptLanguage?: string | null,
  ): Promise<void> {
    try {
      const locale = await resolveEmailLocale({ userLocale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      await this.emailQueueService.enqueueEmail({
        to: oldEmail,
        subject: t.security.primaryEmailChanged.subject,
        template: SecurityAlertEmail({
          alertType: "primary-email-changed",
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
          additionalInfo: `New primary email: ${newEmail}`,
          websiteName: siteConfig.name,
          t: t.security,
          tCommon: t.common,
        }),
        templateName: "security-alert",
        priority: JobPriority.HIGH,
      });
    } catch (error) {
      logger.error({ error }, "Failed to send primary email changed alert");
    }
  }

  /**
   * Initialize user emails table for a new user.
   * Called when user is created to add their initial email.
   */
  async initializeUserEmail(
    userId: string,
    email: string,
    verified: boolean = false,
  ): Promise<UserEmail> {
    return userEmailStorage.create({
      userId,
      email: email.toLowerCase(),
      isPrimary: true,
      verifiedAt: verified ? new Date() : null,
    });
  }

  /**
   * Get user by any verified email (for login)
   */
  async getUserByVerifiedEmail(email: string): Promise<{ userId: string } | null> {
    const result = await userEmailStorage.findVerifiedByEmail(email);
    if (!result) return null;
    return { userId: result.userId };
  }

  /**
   * Get primary email for a user
   */
  async getPrimaryEmail(userId: string): Promise<UserEmail | null> {
    return (await userEmailStorage.getPrimaryByUserId(userId)) ?? null;
  }
}
