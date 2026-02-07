import { PasskeyDTO } from "@/dtos/passkey.dto";
import type { PasskeyCredential } from "@/schema/passkey-credentials.schema";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { decodeClientDataJSON, isoBase64URL } from "@simplewebauthn/server/helpers";
import type { PasskeysListResponse } from "@/types/auth/passkeys.types";
import { JobPriority } from "@/types/common/queue.types";
import { siteConfig } from "@/config/site.config";
import {
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  ValidationError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { passkeyChallengeStorage } from "@/storage/runtime/passkey-challenge";
import { passkeyCredentialStorage } from "@/storage/runtime/passkey-credential";
import { userStorage } from "@/storage/runtime/user";
import type { EmailQueueService } from "@/services/email-queue.service";
import type { EmailService } from "@/services/email.service";
import { getEmailTranslations, resolveEmailLocale } from "@/emails/get-translations";
import { SecurityAlertEmail } from "@/emails/security-alert";

type SecurityAlertType = "passkey-added" | "passkey-removed";

export interface PasskeyInfo {
  id: string;
  name: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export class PasskeyService {
  private emailService: EmailService;
  private emailQueueService: EmailQueueService;

  constructor(emailService: EmailService, emailQueueService: EmailQueueService) {
    this.emailService = emailService;
    this.emailQueueService = emailQueueService;
  }

  private ensureConfigured(): void {
    // WebAuthn config is validated by env schema at startup
    // Just check if we're in production and the required vars exist
    if (
      process.env.NODE_ENV === "production" &&
      (!process.env.WEBAUTHN_RP_ID || !process.env.WEBAUTHN_ORIGINS)
    ) {
      throw new ServiceUnavailableError("Service temporarily unavailable. Please try again later.");
    }

    // In development, WebAuthn defaults to localhost (validated by env schema)
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  /**
   * Get the Relying Party ID (domain)
   */
  private getRpId(): string {
    return process.env.WEBAUTHN_RP_ID || "localhost";
  }

  /**
   * Get the Relying Party name
   */
  private getRpName(): string {
    return siteConfig.name;
  }

  /**
   * Get expected origins for WebAuthn verification
   */
  private getExpectedOrigins(): string[] {
    const origins = process.env.WEBAUTHN_ORIGINS;
    if (origins) {
      return origins.split(",").map((o) => o.trim());
    }
    // Default to localhost for development
    return ["http://localhost:3000", "https://localhost:3000"];
  }

  // ============================================================================
  // Security Alerts
  // ============================================================================

  /**
   * Send security alert email for passkey changes via queue
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

      const translationKey = alertType === "passkey-added" ? "passkeyAdded" : "passkeyRemoved";
      const alertTranslation = t.security[translationKey];

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
      logger.error({ error, userId, alertType }, "Failed to enqueue passkey security alert email");
    }
  }

  // ============================================================================
  // Passkey Registration
  // ============================================================================

  /**
   * Generate registration options for a new passkey
   */
  async generateRegistrationOptions(
    userId: string,
    userEmail: string,
    userName?: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    this.ensureConfigured();
    // Get existing passkeys to exclude them
    const existingPasskeys = await passkeyCredentialStorage.findByUserId(userId);
    const excludeCredentials = existingPasskeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports
        ? (JSON.parse(passkey.transports) as AuthenticatorTransportFuture[])
        : undefined,
    }));

    const rpName = this.getRpName();

    const options = await generateRegistrationOptions({
      rpName,
      rpID: this.getRpId(),
      userName: userEmail,
      userDisplayName: userName || userEmail,
      // Don't prompt user for additional authenticators
      attestationType: "none",
      // Prevent re-registering existing authenticators
      excludeCredentials,
      // Allow all authenticator types (platform + cross-platform)
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    // Delete any existing registration challenges for this user to avoid confusion
    await passkeyChallengeStorage.deleteByUserIdAndType(userId, "registration");

    // Store challenge for verification
    await passkeyChallengeStorage.create({
      challenge: options.challenge,
      type: "registration",
      userId,
    });

    return options;
  }

  /**
   * Verify registration response and save passkey
   * @throws {ValidationError} If challenge is expired, invalid type, or verification fails
   * @throws {ForbiddenError} If challenge does not belong to this user
   */
  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    deviceName?: string,
  ): Promise<PasskeyInfo> {
    this.ensureConfigured();
    // Extract the challenge from the response to look it up directly
    const clientDataJSON = decodeClientDataJSON(response.response.clientDataJSON);
    const responseChallenge = clientDataJSON.challenge;

    // Find the specific challenge that was used
    const validChallenge = await passkeyChallengeStorage.findValidChallenge(responseChallenge);

    if (!validChallenge) {
      throw new ValidationError("Challenge expired or not found", "CHALLENGE_EXPIRED");
    }

    // Verify the challenge belongs to this user
    if (validChallenge.userId !== userId) {
      throw new ForbiddenError("Challenge does not belong to this user", "CHALLENGE_USER_MISMATCH");
    }

    // Verify it's a registration challenge
    if (validChallenge.type !== "registration") {
      throw new ValidationError("Invalid challenge type", "INVALID_CHALLENGE_TYPE");
    }

    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
      response,
      expectedChallenge: validChallenge.challenge,
      expectedOrigin: this.getExpectedOrigins(),
      expectedRPID: this.getRpId(),
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new ValidationError("Passkey verification failed", "PASSKEY_VERIFICATION_FAILED");
    }

    const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
      verification.registrationInfo;

    // Generate device name from user agent if not provided
    const name = deviceName || this.generateDeviceName();

    // Save the passkey credential
    const passkey = await passkeyCredentialStorage.create({
      userId,
      credentialId: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: response.response.transports
        ? JSON.stringify(response.response.transports)
        : null,
      name,
      aaguid: aaguid,
    });

    // Delete the used challenge
    await passkeyChallengeStorage.delete(validChallenge.id);

    // Clean up any other expired challenges
    await passkeyChallengeStorage.deleteExpired();

    // Send security alert
    this.sendSecurityAlert(userId, "passkey-added");

    return this.formatPasskeyInfo(passkey);
  }

  // ============================================================================
  // Passkey Authentication
  // ============================================================================

  /**
   * Generate authentication options for passkey login
   */
  async generateAuthenticationOptions(
    userEmail?: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    this.ensureConfigured();
    let allowCredentials: {
      id: string;
      transports?: AuthenticatorTransportFuture[];
    }[] = [];
    let userId: string | undefined;

    // If email provided, get that user's passkeys
    if (userEmail) {
      const user = await userStorage.findByEmail(userEmail);
      if (user) {
        userId = user.id;
        const passkeys = await passkeyCredentialStorage.findByUserId(user.id);
        allowCredentials = passkeys.map((p) => ({
          id: p.credentialId,
          transports: p.transports
            ? (JSON.parse(p.transports) as AuthenticatorTransportFuture[])
            : undefined,
        }));
      }
    }

    // Generate options (empty allowCredentials = discoverable credential flow)
    const options = await generateAuthenticationOptions({
      rpID: this.getRpId(),
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: "preferred",
    });

    // Store challenge for verification
    await passkeyChallengeStorage.create({
      challenge: options.challenge,
      type: "authentication",
      userId: userId || null,
    });

    return options;
  }

  /**
   * Verify authentication response
   * @throws {NotFoundError} If passkey is not found
   * @throws {ValidationError} If challenge is expired, invalid type, or verification fails
   */
  async verifyAuthentication(response: AuthenticationResponseJSON): Promise<string> {
    this.ensureConfigured();
    // Find the passkey by credential ID
    const passkey = await passkeyCredentialStorage.findByCredentialId(response.id);

    if (!passkey) {
      throw new NotFoundError("Passkey", "PASSKEY_NOT_FOUND");
    }

    // Extract the challenge from the response to look it up directly
    const clientDataJSON = decodeClientDataJSON(response.response.clientDataJSON);
    const responseChallenge = clientDataJSON.challenge;

    // Find the specific challenge that was used
    const validChallenge = await passkeyChallengeStorage.findValidChallenge(responseChallenge);

    if (!validChallenge) {
      throw new ValidationError("Challenge expired or not found", "CHALLENGE_EXPIRED");
    }

    // Verify it's an authentication challenge
    if (validChallenge.type !== "authentication") {
      throw new ValidationError("Invalid challenge type", "INVALID_CHALLENGE_TYPE");
    }

    // Build WebAuthn credential object for verification
    const credential: WebAuthnCredential = {
      id: passkey.credentialId,
      publicKey: isoBase64URL.toBuffer(passkey.publicKey),
      counter: passkey.counter,
      transports: passkey.transports
        ? (JSON.parse(passkey.transports) as AuthenticatorTransportFuture[])
        : undefined,
    };

    const verification: VerifiedAuthenticationResponse = await verifyAuthenticationResponse({
      response,
      expectedChallenge: validChallenge.challenge,
      expectedOrigin: this.getExpectedOrigins(),
      expectedRPID: this.getRpId(),
      credential,
    });

    if (!verification.verified) {
      throw new ValidationError("Passkey authentication failed", "PASSKEY_AUTH_FAILED");
    }

    // Update counter and last used timestamp
    await passkeyCredentialStorage.updateCounter(
      passkey.credentialId,
      verification.authenticationInfo.newCounter,
    );

    // Delete the used challenge
    await passkeyChallengeStorage.delete(validChallenge.id);

    // Clean up expired challenges
    await passkeyChallengeStorage.deleteExpired();

    return passkey.userId;
  }

  // ============================================================================
  // Passkey Management
  // ============================================================================

  /**
   * List all passkeys for a user
   */
  async listPasskeys(userId: string): Promise<PasskeysListResponse> {
    const passkeys = await passkeyCredentialStorage.findByUserId(userId);
    return PasskeyDTO.toListResponse(passkeys);
  }

  /**
   * Get passkey count for a user
   */
  async getPasskeyCount(userId: string): Promise<number> {
    return passkeyCredentialStorage.countByUserId(userId);
  }

  /**
   * Check if user has any passkeys
   */
  async hasPasskeys(userId: string): Promise<boolean> {
    return passkeyCredentialStorage.userHasPasskeys(userId);
  }

  /**
   * Rename a passkey
   * @throws {NotFoundError} If passkey is not found or doesn't belong to user
   */
  async renamePasskey(userId: string, passkeyId: string, name: string): Promise<void> {
    const passkey = await passkeyCredentialStorage.findById(passkeyId);

    if (!passkey || passkey.userId !== userId) {
      throw new NotFoundError("Passkey", "PASSKEY_NOT_FOUND");
    }

    await passkeyCredentialStorage.update(passkeyId, { name });
  }

  /**
   * Delete a passkey
   * @throws {NotFoundError} If passkey is not found or doesn't belong to user
   */
  async deletePasskey(userId: string, passkeyId: string): Promise<void> {
    const deleted = await passkeyCredentialStorage.deleteByIdAndUserId(passkeyId, userId);

    if (!deleted) {
      throw new NotFoundError("Passkey", "PASSKEY_NOT_FOUND");
    }

    // Send security alert
    this.sendSecurityAlert(userId, "passkey-removed");
  }

  /**
   * Delete all passkeys for a user
   */
  async deleteAllPasskeys(userId: string): Promise<number> {
    return passkeyCredentialStorage.deleteAllByUserId(userId);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Format passkey credential to PasskeyInfo
   */
  private formatPasskeyInfo(passkey: PasskeyCredential): PasskeyInfo {
    return {
      id: passkey.id,
      name: passkey.name,
      deviceType: passkey.deviceType,
      backedUp: passkey.backedUp,
      createdAt: passkey.createdAt,
      lastUsedAt: passkey.lastUsedAt,
    };
  }

  /**
   * Generate a default device name
   */
  private generateDeviceName(): string {
    const date = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `Passkey ${date}`;
  }
}
