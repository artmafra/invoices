import type { EmailChangeRequest } from "@/schema/email-change-requests.schema";
import type { Token, TokenType } from "@/schema/tokens.schema";
import type { UserInvite } from "@/schema/user-invites.schema";
import { generateSecureCode, generateSecureToken } from "@/lib/security";
import { EmailChangeRequestStorage } from "@/storage/email-change-request.storage";
import { TokenStorage } from "@/storage/token.storage";
import { UserInviteStorage, type PendingInviteWithDetails } from "@/storage/user-invite.storage";

// Token expiry constants
const TOKEN_EXPIRY: Record<TokenType, number> = {
  password_reset: 60 * 60 * 1000, // 1 hour
  user_invite: 7 * 24 * 60 * 60 * 1000, // 7 days
  email_change: 10 * 60 * 1000, // 10 minutes
  email_verification: 10 * 60 * 1000, // 10 minutes
  two_factor_email: 10 * 60 * 1000, // 10 minutes
};

// Token generation strategy
const TOKEN_GENERATOR: Record<TokenType, () => string> = {
  password_reset: () => generateSecureToken(64),
  user_invite: () => generateSecureToken(64),
  email_change: () => generateSecureCode(6),
  email_verification: () => generateSecureCode(6),
  two_factor_email: () => generateSecureCode(6),
};

export interface CreatePasswordResetTokenResult {
  token: Token;
  rawToken: string;
}

export interface CreateUserInviteResult {
  token: Token;
  invite: UserInvite;
  rawToken: string;
}

export interface CreateEmailChangeResult {
  token: Token;
  request: EmailChangeRequest;
  rawCode: string;
}

export interface CreateTwoFactorResult {
  token: Token;
  rawCode: string;
}

export interface ValidatedInvite {
  token: Token;
  invite: UserInvite;
}

export interface ValidatedEmailChange {
  token: Token;
  request: EmailChangeRequest;
}

export class TokenService {
  private tokenStorage: TokenStorage;
  private userInviteStorage: UserInviteStorage;
  private emailChangeRequestStorage: EmailChangeRequestStorage;

  constructor() {
    this.tokenStorage = new TokenStorage();
    this.userInviteStorage = new UserInviteStorage();
    this.emailChangeRequestStorage = new EmailChangeRequestStorage();
  }

  // ===========================================================================
  // Password Reset Tokens
  // ===========================================================================

  /**
   * Create a password reset token for a user.
   * Invalidates any existing password reset tokens for the user.
   */
  async createPasswordResetToken(userId: string): Promise<CreatePasswordResetTokenResult> {
    // Invalidate existing tokens
    await this.tokenStorage.invalidateByUserAndType(userId, "password_reset");

    const rawToken = TOKEN_GENERATOR.password_reset();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.password_reset);

    const token = await this.tokenStorage.create({
      type: "password_reset",
      userId,
      token: rawToken,
      expiresAt,
    });

    return { token, rawToken };
  }

  /**
   * Validate a password reset token.
   * Returns the token if valid, null otherwise.
   */
  async validatePasswordResetToken(rawToken: string): Promise<Token | null> {
    const token = await this.tokenStorage.findValidByHash("password_reset", rawToken);
    return token ?? null;
  }

  /**
   * Mark a password reset token as used.
   */
  async markPasswordResetUsed(tokenId: string): Promise<boolean> {
    return this.tokenStorage.markAsUsed(tokenId);
  }

  // ===========================================================================
  // User Invite Tokens
  // ===========================================================================

  /**
   * Create a user invite.
   * Deletes any existing pending invites for the email.
   */
  async createUserInvite(
    email: string,
    invitedBy: string,
    roleId?: string | null,
  ): Promise<CreateUserInviteResult> {
    const normalizedEmail = email.toLowerCase();

    // Delete existing invites for this email (will cascade to tokens)
    await this.userInviteStorage.deleteByEmail(normalizedEmail);

    const rawToken = TOKEN_GENERATOR.user_invite();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.user_invite);

    // Create token first (invitedBy is the "user" creating the invite)
    const token = await this.tokenStorage.create({
      type: "user_invite",
      userId: invitedBy, // The inviter is the "owner" of this token
      token: rawToken,
      expiresAt,
    });

    // Create invite metadata
    const invite = await this.userInviteStorage.create({
      tokenId: token.id,
      email: normalizedEmail,
      roleId: roleId || null,
      invitedBy,
    });

    return { token, invite, rawToken };
  }

  /**
   * Validate an invite token.
   * Returns the token and invite if valid, null otherwise.
   */
  async validateInviteToken(rawToken: string): Promise<ValidatedInvite | null> {
    const token = await this.tokenStorage.findValidByHash("user_invite", rawToken);
    if (!token) return null;

    const invite = await this.userInviteStorage.findByTokenId(token.id);
    if (!invite) return null;

    return { token, invite };
  }

  /**
   * Get pending invite by email.
   */
  async getPendingInviteByEmail(email: string): Promise<ValidatedInvite | null> {
    const inviteWithToken = await this.userInviteStorage.findPendingByEmail(email);
    if (!inviteWithToken) return null;

    const token = await this.tokenStorage.findById(inviteWithToken.tokenId);
    if (!token) return null;

    return {
      token,
      invite: {
        id: inviteWithToken.id,
        tokenId: inviteWithToken.tokenId,
        email: inviteWithToken.email,
        roleId: inviteWithToken.roleId,
        invitedBy: inviteWithToken.invitedBy,
        createdAt: inviteWithToken.createdAt,
      },
    };
  }

  /**
   * Get all pending invites with details.
   */
  async getPendingInvitesWithDetails(): Promise<PendingInviteWithDetails[]> {
    return this.userInviteStorage.findPendingWithDetails();
  }

  /**
   * Mark an invite token as accepted.
   */
  async markInviteAccepted(tokenId: string): Promise<boolean> {
    return this.tokenStorage.markAsUsed(tokenId);
  }

  /**
   * Delete an invite by ID.
   */
  async deleteInvite(inviteId: string): Promise<boolean> {
    const invite = await this.userInviteStorage.findById(inviteId);
    if (!invite) return false;

    // Delete the token (will cascade to invite)
    return this.tokenStorage.delete(invite.tokenId);
  }

  // ===========================================================================
  // Email Change Tokens
  // ===========================================================================

  /**
   * Create an email change verification code.
   * Deletes any existing pending requests for the user.
   */
  async createEmailChangeToken(userId: string, newEmail: string): Promise<CreateEmailChangeResult> {
    // Delete existing tokens for this user
    await this.tokenStorage.deleteUnusedByUserAndType(userId, "email_change");

    const rawCode = TOKEN_GENERATOR.email_change();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.email_change);

    // Create token with userId scope
    const token = await this.tokenStorage.create({
      type: "email_change",
      userId,
      token: rawCode,
      scope: userId, // Hash is scoped to userId
      expiresAt,
    });

    // Create email change request metadata
    const request = await this.emailChangeRequestStorage.create({
      tokenId: token.id,
      newEmail,
    });

    return { token, request, rawCode };
  }

  /**
   * Validate an email change code for a user.
   * Returns the token and request if valid, null otherwise.
   */
  async validateEmailChangeCode(
    userId: string,
    code: string,
  ): Promise<ValidatedEmailChange | null> {
    const token = await this.tokenStorage.findValidByUserAndToken("email_change", userId, code);
    if (!token) return null;

    const request = await this.emailChangeRequestStorage.findByTokenId(token.id);
    if (!request) return null;

    return { token, request };
  }

  /**
   * Mark an email change token as used.
   */
  async markEmailChangeUsed(tokenId: string): Promise<boolean> {
    return this.tokenStorage.markAsUsed(tokenId);
  }

  // ===========================================================================
  // Email Verification Tokens (for adding secondary emails)
  // ===========================================================================

  /**
   * Create an email verification code for adding a new email.
   * Deletes any existing unused codes for this user + email combination.
   * @param userId User ID
   * @param _userEmailId ID of the user_email record being verified (unused, kept for API compatibility)
   */
  async createEmailVerificationToken(
    userId: string,
    _userEmailId: string,
  ): Promise<CreateTwoFactorResult> {
    // Delete existing unused tokens for this user_email
    await this.tokenStorage.deleteUnusedByUserAndType(userId, "email_verification");

    const rawCode = TOKEN_GENERATOR.email_verification();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.email_verification);

    // Create token with userId scope to match findValidByUserAndToken
    // The userEmailId is stored separately and validated in the service layer
    const token = await this.tokenStorage.create({
      type: "email_verification",
      userId,
      token: rawCode,
      scope: userId, // Use userId for hash scope to match validation
      expiresAt,
    });

    return { token, rawCode };
  }

  /**
   * Validate an email verification code.
   * @param userId User ID
   * @param userEmailId ID of the user_email record (unused, kept for API compatibility)
   * @param code Verification code
   */
  async validateEmailVerificationCode(
    userId: string,
    _userEmailId: string,
    code: string,
  ): Promise<Token | null> {
    // Find token by user and code - userId is used as the hash scope
    const token = await this.tokenStorage.findValidByUserAndToken(
      "email_verification",
      userId,
      code,
    );
    return token ?? null;
  }

  /**
   * Mark an email verification token as used.
   */
  async markEmailVerificationUsed(tokenId: string): Promise<boolean> {
    return this.tokenStorage.markAsUsed(tokenId);
  }

  // ===========================================================================
  // Two-Factor Email Tokens
  // ===========================================================================

  /**
   * Create a 2FA email verification code.
   * Deletes any existing unused codes for the user.
   */
  async createTwoFactorToken(userId: string): Promise<CreateTwoFactorResult> {
    // Delete existing unused tokens for this user
    await this.tokenStorage.deleteUnusedByUserAndType(userId, "two_factor_email");

    const rawCode = TOKEN_GENERATOR.two_factor_email();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.two_factor_email);

    // Create token with userId scope
    const token = await this.tokenStorage.create({
      type: "two_factor_email",
      userId,
      token: rawCode,
      scope: userId, // Hash is scoped to userId
      expiresAt,
    });

    return { token, rawCode };
  }

  /**
   * Validate a 2FA code for a user.
   * Returns the token if valid, null otherwise.
   */
  async validateTwoFactorCode(userId: string, code: string): Promise<Token | null> {
    const token = await this.tokenStorage.findValidByUserAndToken("two_factor_email", userId, code);
    return token ?? null;
  }

  /**
   * Mark a 2FA token as used.
   */
  async markTwoFactorUsed(tokenId: string): Promise<boolean> {
    return this.tokenStorage.markAsUsed(tokenId);
  }

  // ===========================================================================
  // Cleanup Methods
  // ===========================================================================

  /**
   * Delete all expired tokens.
   */
  async cleanupExpiredTokens(): Promise<number> {
    return this.tokenStorage.deleteExpired();
  }

  /**
   * Delete expired tokens of a specific type.
   */
  async cleanupExpiredTokensByType(type: TokenType): Promise<number> {
    return this.tokenStorage.deleteExpiredByType(type);
  }

  /**
   * Get token expiry duration for a type (in milliseconds).
   */
  getExpiryDuration(type: TokenType): number {
    return TOKEN_EXPIRY[type];
  }

  /**
   * Get token expiry duration in a human-readable format.
   */
  getExpiryDurationFormatted(type: TokenType): string {
    const ms = TOKEN_EXPIRY[type];
    if (ms >= 24 * 60 * 60 * 1000) {
      return `${ms / (24 * 60 * 60 * 1000)} days`;
    }
    if (ms >= 60 * 60 * 1000) {
      return `${ms / (60 * 60 * 1000)} hours`;
    }
    return `${ms / (60 * 1000)} minutes`;
  }
}
