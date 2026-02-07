import bcrypt from "bcryptjs";
import { JobPriority } from "@/types/common/queue.types";
import { siteConfig } from "@/config/site.config";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { userStorage } from "@/storage/runtime/user";
import type { EmailQueueService } from "@/services/email-queue.service";
import type { TokenService } from "@/services/token.service";
import type { UserSessionService } from "@/services/user-session.service";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { PasswordResetEmail } from "@/emails/password-reset";

// Token expiry: 1 hour (for display purposes)
const TOKEN_EXPIRY_MINUTES = 60;

export class PasswordResetService {
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
   * Request a password reset for an email address.
   * Always completes silently to prevent email enumeration.
   * @throws {ServiceUnavailableError} If email fails to send
   */
  async requestPasswordReset(email: string, acceptLanguage?: string | null): Promise<void> {
    // Find user by email
    const user = await userStorage.findByEmail(email);

    // Always return silently to prevent email enumeration
    if (!user) {
      logger.info({ email }, "Password reset requested for non-existent email");
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      logger.info({ email, userId: user.id }, "Password reset requested for inactive user");
      return;
    }

    // Create token (invalidates existing tokens automatically)
    const { rawToken } = await this.tokenService.createPasswordResetToken(user.id);

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL is not configured");
    }

    const resetUrl = `${baseUrl}/admin/reset-password?token=${rawToken}`;

    // Resolve locale and load translations
    const locale = await resolveEmailLocale({ userLocale: user.locale, acceptLanguage });
    const t = await getEmailTranslations(locale);

    // Send email
    await this.emailQueueService.enqueueEmail({
      to: user.email,
      subject: t.passwordReset.subject,
      template: PasswordResetEmail({
        resetUrl,
        expiresInMinutes: TOKEN_EXPIRY_MINUTES,
        websiteName: siteConfig.name,
        t: t.passwordReset,
        tCommon: t.common,
      }),
      templateName: "password-reset",
      priority: JobPriority.CRITICAL,
    });

    logger.info({ email, userId: user.id }, "Password reset email queued");
  }

  /**
   * Validate a password reset token.
   * Returns the user ID if valid, null if invalid.
   */
  async validateToken(token: string): Promise<{ valid: boolean; userId?: string; email?: string }> {
    try {
      const resetToken = await this.tokenService.validatePasswordResetToken(token);

      if (!resetToken) {
        return { valid: false };
      }

      // Get user to return email
      const user = await userStorage.findById(resetToken.userId);
      if (!user || !user.isActive) {
        return { valid: false };
      }

      return { valid: true, userId: resetToken.userId, email: user.email };
    } catch (error) {
      logger.error({ error, token }, "Error validating password reset token");
      return { valid: false };
    }
  }

  /**
   * Reset password using a token.
   * @throws {ValidationError} If token is invalid or expired
   * @returns The user ID, email, and name for follow-up actions
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ userId: string; userEmail: string; userName: string }> {
    // Validate token
    const resetToken = await this.tokenService.validatePasswordResetToken(token);

    if (!resetToken) {
      throw new ValidationError("Invalid or expired reset link", "INVALID_RESET_TOKEN");
    }

    // Get user
    const user = await userStorage.findById(resetToken.userId);
    if (!user || !user.isActive) {
      throw new ValidationError("Invalid or expired reset link", "INVALID_RESET_TOKEN");
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await userStorage.update(user.id, { password: hashedPassword });

    // Mark token as used
    await this.tokenService.markPasswordResetUsed(resetToken.id);

    // SECURITY: Revoke ALL sessions after password reset
    // This ensures any attacker sessions are invalidated
    const revokedCount = await this.userSessionService.revokeAllUserSessions(user.id);
    if (revokedCount > 0) {
      logger.info({ userId: user.id, revokedCount }, "Password reset: revoked sessions");
    }

    return { userId: user.id, userEmail: user.email, userName: user.name || "" };
  }

  /**
   * Clean up expired tokens.
   */
  async cleanupExpiredTokens(): Promise<number> {
    return this.tokenService.cleanupExpiredTokensByType("password_reset");
  }
}
