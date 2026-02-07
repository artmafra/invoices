import * as bcrypt from "bcryptjs";
import { TOTP } from "otpauth";
import * as QRCode from "qrcode";
import type { TotpSetupResponse } from "@/types/auth/auth.types";
import { JobPriority } from "@/types/common/queue.types";
import { siteConfig } from "@/config/site.config";
import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { decryptSecret, encryptSecret, generateSecureToken } from "@/lib/security";
import { userStorage } from "@/storage/runtime/user";
import type { EmailQueueService } from "@/services/email-queue.service";
import type { TokenService } from "@/services/token.service";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { SecurityAlertEmail } from "@/emails/security-alert";
import { TwoFactorCodeEmail } from "@/emails/two-factor-code";

type SecurityAlertType =
  | "2fa-email-enabled"
  | "2fa-email-disabled"
  | "totp-enabled"
  | "totp-disabled";

export class TwoFactorService {
  private emailQueueService: EmailQueueService;
  private tokenService: TokenService;
  private totpIssuer: string;

  constructor(
    emailQueueService: EmailQueueService,
    tokenService: TokenService,
    totpIssuer = "Template",
  ) {
    this.emailQueueService = emailQueueService;
    this.tokenService = tokenService;
    this.totpIssuer = totpIssuer;
  }

  // ============================================================================
  // Security Alerts
  // ============================================================================

  /**
   * Send security alert email for 2FA changes via queue
   */
  private async sendSecurityAlert(
    userId: string,
    alertType: SecurityAlertType,
    acceptLanguage?: string | null,
  ): Promise<void> {
    try {
      const user = await userStorage.findById(userId);
      if (!user?.email) return;

      // Resolve locale and load translations
      const locale = await resolveEmailLocale({ userLocale: user.locale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      // Map alert type to translation key
      const translationKeyMap: Record<SecurityAlertType, keyof typeof t.security> = {
        "2fa-email-enabled": "twoFactorEmailEnabled",
        "2fa-email-disabled": "twoFactorEmailDisabled",
        "totp-enabled": "totpEnabled",
        "totp-disabled": "totpDisabled",
      };

      const translationKey = translationKeyMap[alertType];
      const alertTranslation = t.security[translationKey] as { subject: string };

      const template = SecurityAlertEmail({
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
        websiteName: siteConfig.name,
        t: t.security,
        tCommon: t.common,
      });

      await this.emailQueueService.enqueueEmail({
        to: user.email,
        subject: alertTranslation.subject,
        template,
        templateName: `security-alert-${alertType}`,
        priority: JobPriority.HIGH,
        userId,
        metadata: { alertType, locale },
      });
    } catch (error) {
      logger.error({ error, userId, alertType }, "Failed to enqueue 2FA security alert email");
    }
  }
  // ============================================================================
  // Email 2FA Methods
  // ============================================================================

  /**
   * Generate and send a 2FA code via email
   */
  async emailSendCode(
    userId: string,
    email: string,
    acceptLanguage?: string | null,
  ): Promise<boolean> {
    try {
      // Get user for locale
      const user = await userStorage.findById(userId);

      // Resolve locale and load translations
      const locale = await resolveEmailLocale({ userLocale: user?.locale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      // Create token (cleans up existing unused tokens automatically)
      const { rawCode } = await this.tokenService.createTwoFactorToken(userId);

      // Send the code via email
      await this.emailQueueService.enqueueEmail({
        to: email,
        subject: t.twoFactorCode.subject.replace("{code}", rawCode),
        template: TwoFactorCodeEmail({
          code: rawCode,
          websiteName: siteConfig.name,
          t: t.twoFactorCode,
          tCommon: t.common,
        }),
        templateName: "two-factor-code",
        priority: JobPriority.CRITICAL,
      });

      return true;
    } catch (error) {
      logger.error({ error, userId, email }, "Error generating/sending 2FA code");
      return false;
    }
  }

  /**
   * Verify email-based 2FA code
   */
  async emailVerifyCode(userId: string, code: string): Promise<boolean> {
    try {
      const token = await this.tokenService.validateTwoFactorCode(userId, code);
      if (!token) return false;

      // Mark token as used
      await this.tokenService.markTwoFactorUsed(token.id);
      return true;
    } catch (error) {
      logger.error({ error, userId }, "Error verifying email 2FA code");
      return false;
    }
  }

  /**
   * Enable email-based 2FA for a user
   */
  async emailEnable(userId: string): Promise<void> {
    await userStorage.updateTwoFactorSettings(userId, {
      twoFactorEnabled: true,
      emailTwoFactorEnabled: true,
    });

    // Send security alert email
    this.sendSecurityAlert(userId, "2fa-email-enabled");
  }

  /**
   * Disable email-based 2FA for a user
   */
  async emailDisable(userId: string): Promise<void> {
    // Clean up any pending 2FA tokens
    await this.tokenService.cleanupExpiredTokensByType("two_factor_email");

    await userStorage.updateTwoFactorSettings(userId, {
      twoFactorEnabled: false,
      emailTwoFactorEnabled: false,
    });

    // Send security alert email
    this.sendSecurityAlert(userId, "2fa-email-disabled");
  }

  /**
   * Check if email-based 2FA is enabled for a user
   */
  async emailIsEnabled(userId: string): Promise<boolean> {
    const twoFactorStatus = await userStorage.getTwoFactorStatus(userId);

    if (!twoFactorStatus) return false;

    return twoFactorStatus.emailTwoFactorEnabled || twoFactorStatus.twoFactorEnabled;
  }

  // ============================================================================
  // TOTP 2FA Methods
  // ============================================================================

  /**
   * Generate TOTP setup data for a user
   */
  async totpGenerateSetupData(userEmail: string): Promise<TotpSetupResponse> {
    const totp = new TOTP({
      issuer: this.totpIssuer,
      label: userEmail,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
    });

    const secret = totp.secret.base32;
    const otpAuthUrl = totp.toString();

    // Generate QR code with transparent background
    const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl, {
      color: {
        dark: "#000000",
        light: "#ffffff00", // Transparent background
      },
    });

    // Generate backup codes (10 codes, 8 alphanumeric characters each)
    // Using cryptographically secure random generation
    const backupCodes = Array.from({ length: 10 }, () => generateSecureToken(8).toUpperCase());

    return {
      secret,
      qrCodeUrl,
      manualEntryKey: secret,
      backupCodes,
    };
  }

  /**
   * Verify a TOTP code
   */
  async totpVerifyCode(userId: string, code: string): Promise<boolean> {
    try {
      const twoFactorStatus = await userStorage.getTwoFactorStatus(userId);

      if (!twoFactorStatus?.twoFactorSecret) {
        return false;
      }

      // Decrypt the stored secret
      const decryptedSecret = decryptSecret(twoFactorStatus.twoFactorSecret);

      const totp = new TOTP({
        issuer: this.totpIssuer,
        label: "User",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: decryptedSecret,
      });

      const delta = totp.validate({
        token: code,
        window: 1,
      });

      return delta !== null;
    } catch (error) {
      logger.error({ error, userId }, "Error verifying TOTP code");
      return false;
    }
  }

  /**
   * Enable TOTP for a user (verifies code and saves secret)
   * @param userId User ID
   * @param secret TOTP secret
   * @param verificationCode Code from authenticator app
   * @param backupCodes Plaintext backup codes to hash and store
   * @returns Backup codes to display to user
   * @throws {ValidationError} If verification code is invalid
   */
  async totpEnable(
    userId: string,
    secret: string,
    verificationCode: string,
    backupCodes: string[],
  ): Promise<string[]> {
    const totp = new TOTP({
      issuer: this.totpIssuer,
      label: "User",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    const delta = totp.validate({
      token: verificationCode,
      window: 1,
    });

    if (delta === null) {
      throw new ValidationError("Invalid verification code", "INVALID_2FA_CODE");
    }

    // Hash all backup codes with bcrypt before storing
    const hashedBackupCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));

    // Encrypt the TOTP secret before storing
    const encryptedSecret = encryptSecret(secret);

    await userStorage.updateTwoFactorSettings(userId, {
      twoFactorSecret: encryptedSecret,
      twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
      totpTwoFactorEnabled: true,
      preferredTwoFactorMethod: "totp",
    });

    // Send security alert email
    this.sendSecurityAlert(userId, "totp-enabled");

    // Return plaintext codes to show to user (one time only)
    return backupCodes;
  }

  /**
   * Disable TOTP for a user
   */
  async totpDisable(userId: string): Promise<void> {
    try {
      await userStorage.updateTwoFactorSettings(userId, {
        totpTwoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
        preferredTwoFactorMethod: "email",
      });

      // Send security alert email
      this.sendSecurityAlert(userId, "totp-disabled");
    } catch (error) {
      logger.error({ error, userId }, "Error disabling TOTP");
      throw error;
    }
  }

  /**
   * Check if TOTP is enabled for a user
   */
  async totpIsEnabled(userId: string): Promise<boolean> {
    try {
      const twoFactorStatus = await userStorage.getTwoFactorStatus(userId);
      return twoFactorStatus?.totpTwoFactorEnabled ?? false;
    } catch (error) {
      logger.error({ error, userId }, "Error checking TOTP status");
      return false;
    }
  }

  // ============================================================================
  // Backup Code Methods
  // ============================================================================

  /**
   * Verify a backup code and consume it (one-time use)
   * @param userId User ID
   * @param code Backup code to verify
   * @returns true if code was valid and consumed
   */
  async backupVerifyCode(userId: string, code: string): Promise<boolean> {
    try {
      const twoFactorStatus = await userStorage.getTwoFactorStatus(userId);

      if (!twoFactorStatus?.twoFactorBackupCodes) {
        return false;
      }

      const hashedCodes: string[] = JSON.parse(twoFactorStatus.twoFactorBackupCodes);

      // Normalize input code (uppercase, remove spaces/dashes)
      const normalizedCode = code.toUpperCase().replace(/[\s-]/g, "");

      // Find matching code by comparing with bcrypt
      let matchIndex = -1;
      for (let i = 0; i < hashedCodes.length; i++) {
        const isMatch = await bcrypt.compare(normalizedCode, hashedCodes[i]);
        if (isMatch) {
          matchIndex = i;
          break;
        }
      }

      if (matchIndex === -1) {
        return false;
      }

      // Remove the used code (one-time use)
      hashedCodes.splice(matchIndex, 1);

      // Update the remaining codes in database
      await userStorage.updateTwoFactorSettings(userId, {
        twoFactorBackupCodes: hashedCodes.length > 0 ? JSON.stringify(hashedCodes) : null,
      });

      return true;
    } catch (error) {
      logger.error({ error, userId }, "Error verifying backup code");
      return false;
    }
  }

  /**
   * Get the count of remaining backup codes for a user
   */
  async backupGetRemainingCount(userId: string): Promise<number> {
    try {
      const twoFactorStatus = await userStorage.getTwoFactorStatus(userId);
      return twoFactorStatus?.backupCodesCount ?? 0;
    } catch (error) {
      logger.error({ error, userId }, "Error getting backup codes count");
      return 0;
    }
  }

  /**
   * Regenerate backup codes for a user (replaces all existing codes)
   * @param userId User ID
   * @returns Array of new plaintext backup codes
   * @throws {ValidationError} If TOTP is not enabled
   */
  async backupRegenerateCodes(userId: string): Promise<string[]> {
    const twoFactorStatus = await userStorage.getTwoFactorStatus(userId);

    if (!twoFactorStatus?.totpTwoFactorEnabled) {
      throw new ValidationError(
        "TOTP must be enabled to regenerate backup codes",
        "TOTP_NOT_ENABLED",
      );
    }

    // Generate new backup codes (10 codes, 8 alphanumeric characters each)
    const backupCodes = Array.from({ length: 10 }, () => generateSecureToken(8).toUpperCase());

    // Hash all backup codes with bcrypt before storing
    const hashedBackupCodes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));

    await userStorage.updateTwoFactorSettings(userId, {
      twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
    });

    return backupCodes;
  }

  // ============================================================================
  // General 2FA Methods
  // ============================================================================

  /**
   * Verify a 2FA code (auto-detect method or use specified method)
   */
  async verifyCode(
    userId: string,
    code: string,
    method?: "email" | "totp" | "backup",
  ): Promise<boolean> {
    if (method === "email") {
      return this.emailVerifyCode(userId, code);
    } else if (method === "totp") {
      return this.totpVerifyCode(userId, code);
    } else if (method === "backup") {
      return this.backupVerifyCode(userId, code);
    } else {
      // Auto-detect: try email first, then TOTP
      const emailResult = await this.emailVerifyCode(userId, code);
      if (emailResult) return true;

      return this.totpVerifyCode(userId, code);
    }
  }

  /**
   * Check if any 2FA method is enabled for a user
   */
  async isEnabled(userId: string): Promise<boolean> {
    const methods = await this.getAvailableMethods(userId);
    return methods.hasAny;
  }

  /**
   * Disable all 2FA methods for a user
   */
  async disableAll(userId: string): Promise<void> {
    // Clean up any pending 2FA tokens
    await this.tokenService.cleanupExpiredTokensByType("two_factor_email");

    await userStorage.updateTwoFactorSettings(userId, {
      twoFactorEnabled: false,
      emailTwoFactorEnabled: false,
      totpTwoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
    });
  }

  /**
   * Get available 2FA methods for a user
   */
  async getAvailableMethods(userId: string): Promise<{
    email: boolean;
    totp: boolean;
    backup: boolean;
    preferred: string;
    hasAny: boolean;
  }> {
    try {
      const twoFactorStatus = await userStorage.getTwoFactorStatus(userId);

      if (!twoFactorStatus) {
        return { email: false, totp: false, backup: false, preferred: "email", hasAny: false };
      }

      const emailEnabled =
        twoFactorStatus.emailTwoFactorEnabled || twoFactorStatus.twoFactorEnabled;
      const totpEnabled = twoFactorStatus.totpTwoFactorEnabled;
      const backupEnabled = twoFactorStatus.backupCodesCount > 0;

      return {
        email: emailEnabled,
        totp: totpEnabled,
        backup: backupEnabled,
        preferred: twoFactorStatus.preferredTwoFactorMethod || "email",
        hasAny: emailEnabled || totpEnabled,
      };
    } catch (error) {
      logger.error({ error, userId }, "Error getting available 2FA methods");
      return { email: false, totp: false, backup: false, preferred: "email", hasAny: false };
    }
  }

  /**
   * Set preferred 2FA method
   */
  async setPreferredMethod(userId: string, method: "email" | "totp"): Promise<void> {
    try {
      await userStorage.setPreferredTwoFactorMethod(userId, method);
    } catch (error) {
      logger.error({ error, userId, method }, "Error setting preferred 2FA method");
      throw error;
    }
  }
}
