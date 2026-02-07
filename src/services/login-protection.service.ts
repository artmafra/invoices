import { JobPriority } from "@/types/common/queue.types";
import { siteConfig } from "@/config/site.config";
import { ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/rate-limit";
import { parseUserAgent } from "@/lib/user-agent";
import { redis } from "@/db/redis";
import { userStorage } from "@/storage/runtime/user";
import type { EmailQueueService } from "@/services/email-queue.service";
import { AccountLockoutEmail } from "@/emails/account-lockout";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";

// Lockout configuration
const LOCKOUT_THRESHOLD = 10; // Lock after 10 failed attempts
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes
const ATTEMPT_WINDOW_SECONDS = 60 * 60; // 1 hour window for counting attempts

// Redis key prefixes
const ATTEMPTS_PREFIX = "lockout:attempts:";
const LOCKED_PREFIX = "lockout:locked:";

export interface LockStatus {
  locked: boolean;
  remainingSeconds?: number;
  failedAttempts?: number;
}

export interface LockStatusWithEmail extends LockStatus {
  email: string;
}

export class LoginProtectionService {
  private emailQueueService: EmailQueueService;

  constructor(emailQueueService: EmailQueueService) {
    this.emailQueueService = emailQueueService;
  }

  /**
   * Normalize email for consistent Redis keys
   */
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Check if an account is currently locked
   */
  async checkLockout(email: string): Promise<LockStatus> {
    const normalizedEmail = this.normalizeEmail(email);
    const lockedKey = `${LOCKED_PREFIX}${normalizedEmail}`;

    try {
      const ttl = await redis.ttl(lockedKey);

      if (ttl > 0 || ttl === -1) {
        return {
          locked: true,
          remainingSeconds: ttl,
        };
      }

      return { locked: false };
    } catch (error) {
      logger.error({ error, email }, "[Login Protection] Lockout check failed");
      if (process.env.NODE_ENV === "production") {
        throw new ServiceUnavailableError(
          "Service temporarily unavailable. Please try again later.",
        );
      }
      return { locked: false };
    }
  }

  /**
   * Record a failed login attempt and potentially trigger lockout
   */
  async recordFailedAttempt(
    email: string,
    request?: Request,
  ): Promise<{ locked: boolean; attempts: number }> {
    const normalizedEmail = this.normalizeEmail(email);
    const attemptsKey = `${ATTEMPTS_PREFIX}${normalizedEmail}`;
    const lockedKey = `${LOCKED_PREFIX}${normalizedEmail}`;

    try {
      // Increment failed attempts counter
      const attempts = await redis.incr(attemptsKey);

      // Set expiry on first attempt
      if (attempts === 1) {
        await redis.expire(attemptsKey, ATTEMPT_WINDOW_SECONDS);
      }

      // Check if we've hit the threshold
      if (attempts >= LOCKOUT_THRESHOLD) {
        // Lock the account
        await redis.setex(lockedKey, LOCKOUT_DURATION_SECONDS, "1");

        // Clear attempts counter (will reset after lockout)
        await redis.del(attemptsKey);

        // Send lockout notification email
        await this.sendLockoutEmail(email, attempts, request);

        return { locked: true, attempts };
      }

      return { locked: false, attempts };
    } catch (error) {
      logger.error({ error, email }, "[Login Protection] Failed to record login attempt");
      if (process.env.NODE_ENV === "production") {
        throw new ServiceUnavailableError(
          "Service temporarily unavailable. Please try again later.",
        );
      }
      return { locked: false, attempts: 0 };
    }
  }

  /**
   * Clear failed attempts on successful login
   */
  async clearAttempts(email: string): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    const attemptsKey = `${ATTEMPTS_PREFIX}${normalizedEmail}`;

    await redis.del(attemptsKey);
  }

  /**
   * Manually unlock an account (admin action)
   */
  async unlockAccount(email: string): Promise<boolean> {
    const normalizedEmail = this.normalizeEmail(email);
    const lockedKey = `${LOCKED_PREFIX}${normalizedEmail}`;
    const attemptsKey = `${ATTEMPTS_PREFIX}${normalizedEmail}`;

    // Remove both lock and attempts
    await redis.del(lockedKey);
    await redis.del(attemptsKey);

    return true;
  }

  /**
   * Get lock status for a user (for admin UI)
   */
  async getLockStatus(email: string): Promise<LockStatus> {
    const normalizedEmail = this.normalizeEmail(email);
    const lockedKey = `${LOCKED_PREFIX}${normalizedEmail}`;
    const attemptsKey = `${ATTEMPTS_PREFIX}${normalizedEmail}`;

    try {
      const [ttl, attemptsStr] = await Promise.all([redis.ttl(lockedKey), redis.get(attemptsKey)]);
      const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

      if (ttl > 0 || ttl === -1) {
        return {
          locked: true,
          remainingSeconds: ttl,
          failedAttempts: LOCKOUT_THRESHOLD,
        };
      }

      return {
        locked: false,
        failedAttempts: attempts ?? 0,
      };
    } catch (error) {
      logger.error({ error, email }, "[Login Protection] Failed to get lock status");
      if (process.env.NODE_ENV === "production") {
        throw new ServiceUnavailableError(
          "Service temporarily unavailable. Please try again later.",
        );
      }
      return { locked: false, failedAttempts: 0 };
    }
  }

  /**
   * Get lock status for multiple emails (bulk operation for admin list)
   */
  async getBulkLockStatus(emails: string[]): Promise<Map<string, LockStatus>> {
    const result = new Map<string, LockStatus>();

    if (!redis || emails.length === 0) {
      if (process.env.NODE_ENV === "production" && emails.length > 0) {
        throw new ServiceUnavailableError(
          "Service temporarily unavailable. Please try again later.",
        );
      }
      emails.forEach((email) => result.set(email.toLowerCase(), { locked: false }));
      return result;
    }

    // Build keys for all emails
    const normalizedEmails = emails.map((e) => this.normalizeEmail(e));

    // Use pipeline for efficient bulk operations
    const pipeline = redis.pipeline();

    for (const email of normalizedEmails) {
      pipeline.ttl(`${LOCKED_PREFIX}${email}`);
    }

    try {
      const ttlResults = await pipeline.exec();

      if (!ttlResults) {
        throw new Error("Pipeline execution returned null");
      }

      // Map results back to emails - ioredis returns [error, result][] tuples
      normalizedEmails.forEach((email, index) => {
        const [error, ttl] = ttlResults[index];
        if (error || typeof ttl !== "number") {
          result.set(email, { locked: false });
        } else {
          result.set(email, {
            locked: ttl > 0 || ttl === -1,
            remainingSeconds: ttl > 0 ? ttl : undefined,
          });
        }
      });

      return result;
    } catch (error) {
      logger.error(
        { error, emailCount: normalizedEmails.length },
        "[Login Protection] Failed to fetch bulk lock status",
      );
      if (process.env.NODE_ENV === "production") {
        throw new ServiceUnavailableError(
          "Service temporarily unavailable. Please try again later.",
        );
      }
      normalizedEmails.forEach((email) => result.set(email, { locked: false }));
      return result;
    }
  }

  /**
   * Send lockout notification email
   */
  private async sendLockoutEmail(
    email: string,
    failedAttempts: number,
    request?: Request,
  ): Promise<void> {
    try {
      const ip = request ? getClientIp(request) : undefined;
      const userAgent = request?.headers.get("user-agent");
      const acceptLanguage = request?.headers.get("accept-language");
      const parsedUA = userAgent ? parseUserAgent(userAgent) : undefined;
      const deviceInfo = parsedUA ? `${parsedUA.browser} on ${parsedUA.os}` : undefined;

      const lockoutDuration = `${Math.floor(LOCKOUT_DURATION_SECONDS / 60)} minutes`;

      // Get user for locale preference
      const user = await userStorage.findByEmail(email);

      // Resolve locale and load translations
      const locale = await resolveEmailLocale({ userLocale: user?.locale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      await this.emailQueueService.enqueueEmail({
        to: email,
        subject: t.accountLockout.subject,
        template: AccountLockoutEmail({
          userName: user?.name ?? undefined,
          lockoutTime: new Date().toLocaleString(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZoneName: "short",
          }),
          ipAddress: ip,
          deviceInfo,
          failedAttempts,
          lockoutDuration,
          websiteName: siteConfig.name,
          t: t.accountLockout,
          tCommon: t.common,
        }),
        templateName: "account-lockout",
        priority: JobPriority.HIGH,
      });
    } catch (error) {
      logger.error(
        { error, email, failedAttempts },
        "[Login Protection] Failed to send lockout notification",
      );
    }
  }
}
