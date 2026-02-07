import { JobPriority } from "@/types/common/queue.types";
import { siteConfig } from "@/config/site.config";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { roleStorage } from "@/storage/runtime/role";
import { userStorage } from "@/storage/runtime/user";
import type { PendingInviteWithDetails } from "@/storage/user-invite.storage";
import type { EmailQueueService } from "@/services/email-queue.service";
import type { TokenService } from "@/services/token.service";
import type { UserService } from "@/services/user.service";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { InviteEmail } from "@/emails/invite";

// Token expiry: 7 days (for display purposes)
const TOKEN_EXPIRY_DAYS = 7;

export class InviteService {
  private emailQueueService: EmailQueueService;
  private tokenService: TokenService;
  private userService: UserService;

  constructor(
    emailQueueService: EmailQueueService,
    tokenService: TokenService,
    userService: UserService,
  ) {
    this.emailQueueService = emailQueueService;
    this.tokenService = tokenService;
    this.userService = userService;
  }

  /**
   * Create and send an invitation to a new user.
   * Overwrites any existing pending invite for the same email.
   * @throws {ConflictError} If user with email already exists
   * @throws {ServiceUnavailableError} If email fails to send
   */
  async createInvite(
    email: string,
    invitedBy: string,
    roleId?: string | null,
    acceptLanguage?: string | null,
  ): Promise<void> {
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    const existingUser = await userStorage.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictError("A user with this email already exists", "USER_EXISTS");
    }

    // Create invite (deletes any existing pending invites for this email automatically)
    const { rawToken } = await this.tokenService.createUserInvite(
      normalizedEmail,
      invitedBy,
      roleId,
    );

    // Get inviter name and role name for email
    const inviter = await userStorage.findById(invitedBy);
    const role = roleId ? await roleStorage.findById(roleId) : null;

    // Build invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    const inviteUrl = `${baseUrl}/auth/invite?token=${rawToken}`;

    // Resolve locale (invitee has no saved preference, use Accept-Language or default)
    const locale = await resolveEmailLocale({ acceptLanguage });
    const t = await getEmailTranslations(locale);

    // Send email
    await this.emailQueueService.enqueueEmail({
      to: normalizedEmail,
      subject: t.invite.subject.replace("{siteName}", siteConfig.name),
      template: InviteEmail({
        inviteUrl,
        inviterName: inviter?.name || undefined,
        roleName: role?.displayName || undefined,
        expiresInDays: TOKEN_EXPIRY_DAYS,
        websiteName: siteConfig.name,
        t: t.invite,
        tCommon: t.common,
      }),
      templateName: "invite",
      priority: JobPriority.CRITICAL,
    });

    logger.info({ email, invitedBy, roleId }, "Invite email queued");
  }

  /**
   * Validate an invitation token.
   * Returns the email and role info if valid.
   */
  async validateInvite(token: string): Promise<{
    valid: boolean;
    email?: string;
    roleName?: string;
  }> {
    try {
      const result = await this.tokenService.validateInviteToken(token);

      if (!result) {
        return { valid: false };
      }

      // Get role name if assigned
      let roleName: string | undefined;
      if (result.invite.roleId) {
        const role = await roleStorage.findById(result.invite.roleId);
        roleName = role?.displayName;
      }

      return {
        valid: true,
        email: result.invite.email,
        roleName,
      };
    } catch (error) {
      logger.error({ error, token }, "Error validating invite token");
      return { valid: false };
    }
  }

  /**
   * Accept an invitation and create the user account.
   * Returns the user ID for auto-login.
   * @throws {ValidationError} If token is invalid or expired
   * @throws {ConflictError} If user with email already exists
   */
  async acceptInvite(token: string, name: string, password: string): Promise<string> {
    // Validate token
    const result = await this.tokenService.validateInviteToken(token);

    if (!result) {
      throw new ValidationError("Invalid or expired invitation link", "INVALID_INVITE_TOKEN");
    }

    const { token: inviteToken, invite } = result;

    // Check if user was created after invite was sent (race condition)
    const existingUser = await userStorage.findByEmail(invite.email);
    if (existingUser) {
      // Mark token as accepted and return error
      await this.tokenService.markInviteAccepted(inviteToken.id);
      throw new ConflictError("An account with this email already exists", "USER_EXISTS");
    }

    // Create the user
    const user = await this.userService.createUser({
      email: invite.email,
      name,
      password,
      roleId: invite.roleId,
      isActive: true,
      emailVerified: new Date(), // Email is verified since they received the invite
    });

    // Mark token as accepted
    await this.tokenService.markInviteAccepted(inviteToken.id);

    return user.id;
  }

  /**
   * Clean up expired tokens.
   */
  async cleanupExpiredTokens(): Promise<number> {
    return this.tokenService.cleanupExpiredTokensByType("user_invite");
  }

  /**
   * Get all pending invitations.
   */
  async getPendingInvites(): Promise<PendingInviteWithDetails[]> {
    return this.tokenService.getPendingInvitesWithDetails();
  }

  /**
   * Cancel (delete) a pending invitation.
   * @throws {NotFoundError} If invitation is not found
   * @throws {ValidationError} If invitation was already accepted
   */
  async cancelInvite(inviteId: string): Promise<void> {
    const deleted = await this.tokenService.deleteInvite(inviteId);

    if (!deleted) {
      throw new NotFoundError("Invitation", "INVITE_NOT_FOUND");
    }
  }

  /**
   * Resend an invitation email.
   * Deletes the old invite and creates a new one with fresh expiry.
   * @throws {NotFoundError} If invitation is not found
   * @throws {ValidationError} If invitation was already accepted
   */
  async resendInvite(inviteId: string, resendBy: string): Promise<void> {
    // We need to find the invite by ID using the pending invites list
    const pendingInvites = await this.tokenService.getPendingInvitesWithDetails();
    const invite = pendingInvites.find((i) => i.id === inviteId);

    if (!invite) {
      throw new NotFoundError("Invitation", "INVITE_NOT_FOUND");
    }

    // Create new invite (this will delete the old one automatically since same email)
    await this.createInvite(invite.email, resendBy, invite.roleId);
  }
}
