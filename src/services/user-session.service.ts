import { UserSessionDTO } from "@/dtos/user-session.dto";
import type { UserSession } from "@/schema/user-session.schema";
import { JobPriority } from "@/types/common/queue.types";
import type { ProfileSessionsListResponse } from "@/types/sessions/sessions.types";
import { siteConfig } from "@/config/site.config";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateSecureToken } from "@/lib/security";
import { parseUserAgent } from "@/lib/user-agent";
import { userStorage } from "@/storage/runtime/user";
import { userSessionStorage } from "@/storage/runtime/user-session";
import type { EmailQueueService } from "@/services/email-queue.service";
import type { EmailService } from "@/services/email.service";
import type { GeolocationService } from "@/services/geolocation.service";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { NewLoginEmail } from "@/emails/new-login";

// Session duration: 30 days
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Absolute session lifetime (configurable via env, default 45 days)
const ABSOLUTE_SESSION_LIFETIME_DAYS = parseInt(
  process.env.SESSION_ABSOLUTE_LIFETIME_DAYS || "45",
  10,
);
const ABSOLUTE_SESSION_LIFETIME_MS = ABSOLUTE_SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000;

export interface CreateSessionParams {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  acceptLanguage?: string | null;
}

export interface ParsedUserAgent {
  deviceType: string;
  browser: string;
  os: string;
}

export class UserSessionService {
  private emailService: EmailService;
  private geolocationService: GeolocationService;
  private emailQueueService: EmailQueueService;

  constructor(
    emailService: EmailService,
    geolocationService: GeolocationService,
    emailQueueService: EmailQueueService,
  ) {
    this.emailService = emailService;
    this.geolocationService = geolocationService;
    this.emailQueueService = emailQueueService;
  }

  /**
   * Parse user agent string to extract device info
   */
  parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
    return parseUserAgent(userAgent);
  }

  /**
   * Check if we can send a login email (rate limiting via Redis)
   * Falls back to allowing if Redis is not configured
   */
  private async canSendLoginEmail(userId: string): Promise<boolean> {
    const result = await checkRateLimit("twoFactorResend", `login-email:${userId}`);
    // If rate limiting is not configured or errored, allow the email
    if (!result) return true;
    return result.success;
  }

  /**
   * Send new login notification email via queue
   */
  private async sendNewLoginEmail(
    userId: string,
    parsedUA: ParsedUserAgent,
    ipAddress: string | null,
    acceptLanguage?: string | null,
  ): Promise<void> {
    try {
      // Check rate limit (Redis-backed)
      const canSend = await this.canSendLoginEmail(userId);
      if (!canSend) {
        return;
      }

      // Get user email
      const user = await userStorage.findById(userId);
      if (!user?.email) return;

      // Resolve locale and load translations
      const locale = await resolveEmailLocale({ userLocale: user.locale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      const template = NewLoginEmail({
        userName: user.name ?? undefined,
        deviceType: parsedUA.deviceType,
        browser: parsedUA.browser,
        operatingSystem: parsedUA.os,
        ipAddress: ipAddress ?? undefined,
        loginTime: new Date().toLocaleString(locale, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        }),
        websiteName: siteConfig.name,
        t: t.newLogin,
        tCommon: t.common,
      });

      await this.emailQueueService.enqueueEmail({
        to: user.email,
        subject: t.newLogin.subject,
        template,
        templateName: "new-login",
        priority: JobPriority.NORMAL,
        userId,
        metadata: { deviceType: parsedUA.deviceType, browser: parsedUA.browser, ipAddress, locale },
      });
    } catch (error) {
      // Don't fail session creation if email fails
      logger.error({ error, userId, ipAddress }, "Failed to enqueue new login email");
    }
  }

  /**
   * Create a new session for a user
   */
  async createSession(params: CreateSessionParams): Promise<UserSession> {
    const { userId, userAgent, ipAddress, acceptLanguage } = params;

    const sessionToken = generateSecureToken(64);
    const now = Date.now();
    const expiresAt = new Date(now + SESSION_DURATION_MS);
    const absoluteExpiresAt = new Date(now + ABSOLUTE_SESSION_LIFETIME_MS);
    const parsedUA = this.parseUserAgent(userAgent);

    // Fetch geolocation data (async, but we wait for it to store with session)
    const geolocation = await this.geolocationService.getLocation(ipAddress || null);

    const session = await userSessionStorage.create({
      userId,
      sessionToken,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
      deviceType: parsedUA.deviceType,
      browser: parsedUA.browser,
      os: parsedUA.os,
      city: geolocation?.city ?? null,
      country: geolocation?.country ?? null,
      countryCode: geolocation?.countryCode ?? null,
      region: geolocation?.region ?? null,
      isRevoked: false,
      expiresAt,
      absoluteExpiresAt,
      lastActivityAt: new Date(),
    });

    // Send new login notification email (async, don't block session creation)
    this.sendNewLoginEmail(userId, parsedUA, ipAddress || null, acceptLanguage);

    return session;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return userSessionStorage.findActiveByUserId(userId);
  }

  /**
   * Get all active sessions for a user with filtering and sorting
   */
  async getUserSessionsFiltered(
    userId: string,
    filters?: { search?: string; deviceType?: string },
    options?: { sortBy?: "lastActivityAt" | "createdAt"; sortOrder?: "asc" | "desc" },
  ): Promise<ProfileSessionsListResponse> {
    const sessions = await userSessionStorage.findActiveByUserIdFiltered(userId, filters, options);
    return UserSessionDTO.toProfileSessionsResponse(sessions);
  }

  /**
   * Get all active sessions (admin view)
   */
  async getAllActiveSessions(
    filters?: { search?: string; deviceType?: string; userId?: string },
    options?: { page?: number; limit?: number },
  ) {
    return userSessionStorage.findAllActiveWithUser(filters, options);
  }

  /**
   * Update last activity for a session
   */
  async updateActivity(sessionToken: string): Promise<boolean> {
    return userSessionStorage.updateLastActivity(sessionToken);
  }

  /**
   * Touch session telemetry for a DB-backed session row identified by session ID.
   * Useful for JWT session strategy where the server stores a sessionId claim.
   */
  async touchSessionById(
    sessionId: string,
    updates: { lastActivityAt?: Date; expiresAt?: Date },
  ): Promise<boolean> {
    return userSessionStorage.touchById(sessionId, updates);
  }

  /**
   * Check if a session ID is valid (not revoked and not expired)
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await userSessionStorage.findById(sessionId);

    if (!session) return false;
    if (session.isRevoked) return false;
    if (new Date() > session.expiresAt) return false;

    return true;
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string, reason?: string): Promise<UserSession> {
    return userSessionStorage.revoke(sessionId, reason);
  }

  /**
   * Revoke all sessions for a user (logout everywhere)
   */
  async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    return userSessionStorage.revokeAllForUser(userId, exceptSessionId);
  }

  /**
   * Get session by token
   */
  async getSessionByToken(sessionToken: string): Promise<UserSession | null> {
    return (await userSessionStorage.findByToken(sessionToken)) ?? null;
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<UserSession | null> {
    return (await userSessionStorage.findById(sessionId)) ?? null;
  }

  /**
   * Get active session count for a user
   */
  async getActiveSessionCount(userId: string): Promise<number> {
    return userSessionStorage.getActiveSessionCount(userId);
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    return userSessionStorage.deleteExpired();
  }

  /**
   * Revoke sessions for a user after their role has changed.
   * Keeps the current admin's session alive.
   */
  async revokeSessionsForRoleChange(userId: string, exceptSessionId?: string): Promise<number> {
    logger.info({ userId, exceptSessionId }, "Revoking sessions after role change");
    const revokedCount = await userSessionStorage.revokeAllForUser(userId, exceptSessionId);
    logger.info({ userId, revokedCount }, "Sessions revoked after role change");
    return revokedCount;
  }

  /**
   * Revoke sessions for all users with a specific role after role permissions change.
   * Keeps the current admin's session alive.
   */
  async revokeSessionsForRolePermissionsUpdate(
    roleId: string,
    exceptSessionId?: string,
  ): Promise<number> {
    logger.info({ roleId, exceptSessionId }, "Revoking sessions after role permissions update");

    // Get all users with this role
    const users = await userStorage.findByRoleId(roleId);
    const userIds = users.map((u) => u.id);

    if (userIds.length === 0) {
      logger.info({ roleId }, "No users with this role, skipping session revocation");
      return 0;
    }

    let totalRevoked = 0;
    for (const userId of userIds) {
      const count = await userSessionStorage.revokeAllForUser(userId, exceptSessionId);
      totalRevoked += count;
    }

    logger.info(
      { roleId, affectedUsers: userIds.length, totalRevoked },
      "Sessions revoked after role permissions update",
    );
    return totalRevoked;
  }

  /**
   * Revoke sessions for a user after their app permissions have changed.
   * Keeps the current admin's session alive.
   */
  async revokeSessionsForAppPermissionsUpdate(
    userId: string,
    exceptSessionId?: string,
  ): Promise<number> {
    logger.info({ userId, exceptSessionId }, "Revoking sessions after app permissions update");
    const revokedCount = await userSessionStorage.revokeAllForUser(userId, exceptSessionId);
    logger.info({ userId, revokedCount }, "Sessions revoked after app permissions update");
    return revokedCount;
  }
}
