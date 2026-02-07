import { UserDTO } from "@/dtos/user.dto";
import type { User, UserNew } from "@/schema/users.schema";
import bcrypt from "bcryptjs";
import { JobPriority } from "@/types/common/queue.types";
import type { AdminUsersListResponse } from "@/types/users/users.types";
import { siteConfig } from "@/config/site.config";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { userStorage } from "@/storage/runtime/user";
import { userEmailStorage } from "@/storage/runtime/user-email";
import type { FilterOptions, PaginationOptions } from "@/storage/types";
import { UserWithRole } from "@/storage/user.storage";
import type { EmailQueueService } from "@/services/email-queue.service";
import type { EmailService } from "@/services/email.service";
import type { UserSessionService } from "@/services/user-session.service";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { SecurityAlertEmail } from "@/emails/security-alert";

export class UserService {
  private emailService: EmailService;
  private emailQueueService: EmailQueueService;
  private userSessionService: UserSessionService;

  constructor(
    emailService: EmailService,
    emailQueueService: EmailQueueService,
    userSessionService: UserSessionService,
  ) {
    this.emailService = emailService;
    this.emailQueueService = emailQueueService;
    this.userSessionService = userSessionService;
  }

  /**
   * Send security alert email via queue
   */
  private async sendSecurityAlert(
    userId: string,
    alertType: "password-changed" | "account-deactivated",
    acceptLanguage?: string | null,
  ): Promise<void> {
    try {
      const user = await userStorage.findById(userId);
      if (!user?.email) return;

      // Resolve locale and load translations
      const locale = await resolveEmailLocale({ userLocale: user.locale, acceptLanguage });
      const t = await getEmailTranslations(locale);

      const subject =
        t.security[alertType === "password-changed" ? "passwordChanged" : "accountDeactivated"]
          .subject;

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
        subject,
        template,
        templateName: `security-alert-${alertType}`,
        priority: JobPriority.HIGH,
        userId,
        metadata: { alertType, locale },
      });
    } catch (error) {
      logger.error({ error, userId, alertType }, "Failed to enqueue security alert email");
    }
  }
  /**
   * Check if a user exists and is active
   */
  async isUserActive(id: string): Promise<boolean> {
    const user = await userStorage.findById(id);
    return user?.isActive ?? false;
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const user = await userStorage.findById(id);
    return user ?? null;
  }

  /**
   * Get user by ID with role name
   */
  async getUserByIdWithRole(id: string): Promise<UserWithRole | null> {
    const user = await userStorage.findByIdWithRole(id);
    return user ?? null;
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const user = await userStorage.findByEmail(email);
    return user ?? null;
  }

  /**
   * Get collection version for ETag generation.
   * Returns max(updated_at) and count for the filtered set.
   */
  async getUsersVersion(
    filters?: FilterOptions,
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    return userStorage.getCollectionVersion(filters);
  }

  /**
   * Get paginated users with filters (returns DTO for API)
   * @param lockStatuses Optional map of email -> lock status for bulk operations
   */
  async getUsers(
    filters?: FilterOptions,
    options?: PaginationOptions,
    lockStatuses?: Map<string, { locked: boolean; remainingSeconds?: number }>,
  ): Promise<AdminUsersListResponse> {
    const result = await userStorage.findManyPaginatedWithRoles(filters, options);
    return UserDTO.toPaginatedResponse(result, lockStatuses);
  }

  /**
   * Get all users (no pagination, includes role names)
   */
  async getAllUsers(filters?: FilterOptions): Promise<UserWithRole[]> {
    return userStorage.findManyWithRoles(filters);
  }

  /**
   * Get users with pagination (returns DTO for API)
   * @param lockStatuses Optional map of email -> lock status for bulk operations
   */
  async getUsersPaginated(
    filters?: FilterOptions,
    options?: { page?: number; limit?: number; sortBy?: string; sortOrder?: "asc" | "desc" },
    lockStatuses?: Map<string, { locked: boolean; remainingSeconds?: number }>,
  ): Promise<AdminUsersListResponse> {
    const result = await userStorage.findManyPaginatedWithRoles(filters, options);
    return UserDTO.toPaginatedResponse(result, lockStatuses);
  }

  /**
   * Create a new user
   * Also initializes their primary email in the user_emails table
   */
  async createUser(userData: Omit<UserNew, "id" | "createdAt" | "updatedAt">): Promise<User> {
    // Hash password if provided
    const processedData = { ...userData };
    if (userData.password) {
      processedData.password = await bcrypt.hash(userData.password, 12);
    }

    const user = await userStorage.create(processedData as UserNew);

    // Initialize primary email in user_emails table
    await userEmailStorage.create({
      userId: user.id,
      email: user.email.toLowerCase(),
      isPrimary: true,
      verifiedAt: user.emailVerified ?? null,
    });

    return user;
  }

  /**
   * Update user
   */
  async updateUser(
    id: string,
    userData: Partial<Omit<UserNew, "id" | "createdAt" | "updatedAt">>,
  ): Promise<User> {
    // Hash password if being updated
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 12);
    }

    return userStorage.update(id, userData);
  }

  /**
   * Touch user to update updatedAt timestamp.
   * Used when external changes (like linking accounts) need to invalidate profile cache.
   */
  async touchUser(id: string): Promise<User> {
    return userStorage.update(id, {});
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLoginAt(userId: string): Promise<void> {
    return userStorage.updateLastLoginAt(userId);
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<boolean> {
    return userStorage.delete(id);
  }

  /**
   * Soft delete user (deactivate)
   */
  async deactivateUser(id: string): Promise<User> {
    const user = await userStorage.softDelete(id);

    // Revoke all sessions to enforce immediate lockout
    // SECURITY: Deactivated users must not retain access
    const revokedCount = await this.userSessionService.revokeAllUserSessions(id);
    logger.info(
      { userId: id, revokedSessionsCount: revokedCount },
      "[UserService] Revoked all sessions for deactivated user",
    );

    // Send security alert email
    this.sendSecurityAlert(id, "account-deactivated");

    return user;
  }

  /**
   * Restore soft-deleted user
   */
  async reactivateUser(id: string): Promise<User> {
    return userStorage.restore(id);
  }

  /**
   * Verify user password
   *
   * SECURITY: This method is constant-time to prevent timing-based user enumeration.
   * We always perform a bcrypt comparison, even for non-existent users, by comparing
   * against a dummy hash. This ensures consistent ~100-250ms timing regardless of
   * whether the user exists.
   *
   * LOGIN BEHAVIOR: Users can log in with ANY verified email address.
   * The session will always display the primary email for consistency.
   */
  async verifyPassword(email: string, password: string): Promise<User | null> {
    // First, try to find user by any verified email in user_emails table
    const verifiedEmail = await userEmailStorage.findVerifiedByEmail(email);
    let user: User | undefined;

    if (verifiedEmail) {
      // Found a verified email, get the user
      user = await userStorage.findById(verifiedEmail.userId);
    } else {
      // Fallback: Try direct lookup in users table (for backward compatibility
      // during migration or if user_emails table is empty)
      user = await userStorage.findByEmail(email);
    }

    // Pre-computed bcrypt hash (cost factor 12) for timing-safe comparison
    // when user doesn't exist or has no password. The actual password value
    // doesn't matter since we'll reject anyway - we just need consistent timing.
    const DUMMY_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYuux.3qJfGK";

    // Always perform bcrypt comparison to ensure constant timing
    const hashToCompare = user?.password || DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    // Only return user if: user exists, has a password, and password is valid
    if (!user || !user.password || !isValid) {
      return null;
    }

    return user;
  }

  /**
   * Verify password for a user by ID (for step-up authentication)
   *
   * SECURITY: This method is constant-time to prevent timing attacks.
   * We always perform a bcrypt comparison, even for users without passwords.
   */
  async verifyPasswordById(userId: string, password: string): Promise<boolean> {
    const user = await userStorage.findById(userId);

    // Pre-computed bcrypt hash (cost factor 12) for timing-safe comparison
    const DUMMY_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYuux.3qJfGK";

    // Always perform bcrypt comparison to ensure constant timing
    const hashToCompare = user?.password || DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCompare);

    // Only return true if: user exists, has a password, and password is valid
    return !!(user && user.password && isValid);
  }

  /**
   * Set user password (used after step-up auth verification)
   * Does not require current password since identity was already verified via step-up auth
   * @throws {NotFoundError} When user does not exist
   */
  async setPassword(id: string, newPassword: string): Promise<User> {
    const user = await userStorage.findById(id);

    if (!user) {
      throw new NotFoundError("User", "USER_NOT_FOUND");
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    const updatedUser = await userStorage.update(id, { password: hashedNewPassword });

    // Send security alert email
    this.sendSecurityAlert(id, "password-changed");

    return updatedUser;
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    const [totalUsers, activeUsers, roleStats, recentUsers] = await Promise.all([
      userStorage.findMany(),
      userStorage.findMany({ isActive: true }),
      userStorage.countByRole(),
      userStorage.getRecentUsers(5),
    ]);

    return {
      total: totalUsers.length,
      active: activeUsers.length,
      inactive: totalUsers.length - activeUsers.length,
      roleDistribution: roleStats,
      recentUsers,
    };
  }

  /**
   * Search users
   */
  async searchUsers(searchTerm: string, options?: PaginationOptions) {
    return userStorage.findManyPaginatedWithRoles({ search: searchTerm, isActive: true }, options);
  }

  /**
   * Get users by role ID
   */
  async getUsersByRoleId(roleId: string, options?: PaginationOptions) {
    return userStorage.findManyPaginatedWithRoles({ roleId, isActive: true }, options);
  }
}
