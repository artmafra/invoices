import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { logger } from "@/lib/logger";
import { createPending2faToken } from "@/lib/pending-2fa-token";
import { checkRateLimit, constantTimeDelay } from "@/lib/rate-limit";
import { loginHistoryService } from "@/services/runtime/login-history";
import { loginProtectionService } from "@/services/runtime/login-protection";
import { passkeyService } from "@/services/runtime/passkey";
import { twoFactorService } from "@/services/runtime/two-factor";
import { userService } from "@/services/runtime/user";
import { createSessionForUser, getRequestMetadata, getUserPermissionsData } from "./helpers";

/**
 * Custom error for 2FA required flow
 * The token contains encrypted userId, email, and availableMethods
 */
class TwoFactorRequiredError extends CredentialsSignin {
  code: string;

  constructor(token: string) {
    super();
    this.code = `2FA_REQUIRED:${token}`;
  }
}

/**
 * Google OAuth provider
 */
export const googleProvider = Google({
  clientId: process.env.NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID || "",
  clientSecret: process.env.AUTH_GOOGLE_SECRET || "",
});

/**
 * Email/password credentials provider
 */
export const credentialsProvider = Credentials({
  id: "credentials",
  name: "credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    const { ipAddress, userAgent } = await getRequestMetadata();
    const email = (credentials.email as string).toLowerCase();

    // Look up user early to have userId for login history (even for failures)
    const existingUser = await userService.getUserByEmail(email);
    const userId = existingUser?.id;

    try {
      // Rate limit by IP + email combo to prevent brute force attacks
      const rateLimitKey = `${ipAddress || "unknown"}:${email}`;
      const rateLimitResult = await checkRateLimit("nextAuthSignin", rateLimitKey);

      if (rateLimitResult && !rateLimitResult.success) {
        // Record rate-limited attempt
        loginHistoryService.recordAttempt({
          userId,
          identifier: email,
          success: false,
          authMethod: "password",
          failureReason: "rate_limited",
          ipAddress,
          userAgent,
        });
        await constantTimeDelay(100, 200);
        return null;
      }

      // Check if account is locked due to too many failed attempts
      const lockStatus = await loginProtectionService.checkLockout(email);
      if (lockStatus.locked) {
        // Record locked attempt
        loginHistoryService.recordAttempt({
          userId,
          identifier: email,
          success: false,
          authMethod: "password",
          failureReason: "account_locked",
          ipAddress,
          userAgent,
        });
        await constantTimeDelay(100, 200);
        return null;
      }

      const user = await userService.verifyPassword(
        credentials.email as string,
        credentials.password as string,
      );

      if (!user) {
        // Record failed attempt (may trigger lockout)
        await loginProtectionService.recordFailedAttempt(email);
        // Record failed login - invalid credentials
        loginHistoryService.recordAttempt({
          userId,
          identifier: email,
          success: false,
          authMethod: "password",
          failureReason: "invalid_credentials",
          ipAddress,
          userAgent,
        });
        await constantTimeDelay(100, 200);
        return null;
      }

      if (!user.isActive) {
        // Record failed login - account deactivated
        loginHistoryService.recordAttempt({
          userId: user.id,
          identifier: email,
          success: false,
          authMethod: "password",
          failureReason: "account_deactivated",
          ipAddress,
          userAgent,
        });
        await constantTimeDelay(100, 200);
        return null;
      }

      // Clear failed attempts on successful password verification
      await loginProtectionService.clearAttempts(email);

      // Check if 2FA is required
      const availableMethods = await twoFactorService.getAvailableMethods(user.id);

      if (availableMethods.hasAny) {
        // Auto-send email code if email is the only 2FA method available
        if (availableMethods.email && !availableMethods.totp) {
          await twoFactorService.emailSendCode(user.id, user.email);
        }

        // Create encrypted token with 2FA data
        const token = createPending2faToken({
          userId: user.id,
          email: user.email,
          availableMethods,
        });

        // Throw error with token - client will parse this
        throw new TwoFactorRequiredError(token);
      }

      // Get role and permissions
      const { roleName, isSystemRole, permissions, apps } = await getUserPermissionsData(
        user.id,
        user.roleId,
      );

      // Create session
      const sessionId = await createSessionForUser(user.id);

      // Record successful login
      loginHistoryService.recordAttempt({
        userId: user.id,
        userName: user.name,
        identifier: email,
        success: true,
        authMethod: "password",
        ipAddress,
        userAgent,
        sessionId,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: roleName,
        roleId: user.roleId,
        isSystemRole,
        permissions,
        apps,
        twoFactorEnabled: false,
        twoFactorVerified: true,
        sessionId,
        authMethod: "password" as const,
        lastAuthAt: Date.now(),
      };
    } catch (error) {
      // Re-throw TwoFactorRequiredError so NextAuth passes it to the client
      if (error instanceof TwoFactorRequiredError) {
        throw error;
      }

      logger.error({ error, email, ipAddress }, "[Auth] Credentials authentication error");
      // Record failed login - unknown error
      loginHistoryService.recordAttempt({
        userId,
        identifier: email,
        success: false,
        authMethod: "password",
        failureReason: "internal_error",
        ipAddress,
        userAgent,
      });
      return null;
    }
  },
});

/**
 * Two-factor authentication provider
 */
export const twoFactorProvider = Credentials({
  id: "two-factor",
  name: "two-factor",
  credentials: {
    userId: { label: "User ID", type: "text" },
    code: { label: "2FA Code", type: "text" },
    method: { label: "Method", type: "text" },
  },
  async authorize(credentials) {
    if (!credentials?.userId || !credentials?.code) {
      return null;
    }

    const { ipAddress, userAgent } = await getRequestMetadata();

    try {
      // Rate limit by userId
      const rateLimitResult = await checkRateLimit("twoFactorVerify", credentials.userId as string);

      if (rateLimitResult && !rateLimitResult.success) {
        await constantTimeDelay(100, 200);
        return null;
      }

      // Verify the 2FA code
      const method = (credentials.method as "email" | "totp" | "backup" | undefined) || undefined;
      const isValidCode = await twoFactorService.verifyCode(
        credentials.userId as string,
        credentials.code as string,
        method,
      );

      if (!isValidCode) {
        await constantTimeDelay(100, 200);
        return null;
      }

      // Get user details
      const user = await userService.getUserById(credentials.userId as string);

      if (!user || !user.isActive) {
        return null;
      }

      // Get role and permissions
      const { roleName, isSystemRole, permissions, apps } = await getUserPermissionsData(
        user.id,
        user.roleId,
      );

      // Create session
      const sessionId = await createSessionForUser(user.id);

      // Record successful login (2FA completion counts as password auth)
      loginHistoryService.recordAttempt({
        userId: user.id,
        userName: user.name,
        identifier: user.email,
        success: true,
        authMethod: "password",
        ipAddress,
        userAgent,
        sessionId,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: roleName,
        roleId: user.roleId,
        isSystemRole,
        permissions,
        apps,
        twoFactorEnabled: true,
        twoFactorVerified: true,
        sessionId,
        authMethod: "password" as const,
        lastAuthAt: Date.now(),
      };
    } catch (error) {
      logger.error({ error }, "[Auth] 2FA verification error");
      return null;
    }
  },
});

/**
 * Passkey (WebAuthn) authentication provider
 * SECURITY: Requires a verification token from /api/auth/passkey/authenticate/verify
 * to prove that WebAuthn authentication was actually performed server-side.
 * This prevents attackers from bypassing authentication by POSTing with just a userId.
 */
export const passkeyProvider = Credentials({
  id: "passkey",
  name: "passkey",
  credentials: {
    userId: { label: "User ID", type: "text" },
    verificationToken: { label: "Verification Token", type: "text" },
  },
  async authorize(credentials) {
    if (!credentials?.userId || !credentials?.verificationToken) {
      return null;
    }

    const { ipAddress, userAgent } = await getRequestMetadata();

    try {
      // CRITICAL: Verify the authentication token from the WebAuthn verification endpoint
      // This proves that server-side verification actually happened
      const { verifyAndConsumeToken } = await import("./session-token");
      const tokenData = await verifyAndConsumeToken(
        credentials.verificationToken as string,
        "passkey-sign-in",
        credentials.userId as string,
      );

      if (!tokenData) {
        // Token is missing, expired, already used, or doesn't match userId
        // This prevents attackers from bypassing WebAuthn verification
        logger.warn(
          { userId: credentials.userId, ipAddress },
          "[Auth] Passkey sign-in attempted with invalid verification token",
        );
        loginHistoryService.recordAttempt({
          userId: credentials.userId as string,
          success: false,
          authMethod: "passkey",
          failureReason: "invalid_verification_token",
          ipAddress,
          userAgent,
        });
        return null;
      }

      const user = await userService.getUserById(credentials.userId as string);

      if (!user) {
        // Record failed passkey login - user not found
        loginHistoryService.recordAttempt({
          identifier: credentials.userId as string,
          success: false,
          authMethod: "passkey",
          failureReason: "user_not_found",
          ipAddress,
          userAgent,
        });
        return null;
      }

      if (!user.isActive) {
        // Record failed passkey login - account deactivated
        loginHistoryService.recordAttempt({
          userId: user.id,
          identifier: user.email,
          success: false,
          authMethod: "passkey",
          failureReason: "account_deactivated",
          ipAddress,
          userAgent,
        });
        return null;
      }

      // Verify the user actually has passkeys
      const hasPasskeys = await passkeyService.hasPasskeys(user.id);
      if (!hasPasskeys) {
        // Record failed passkey login - no passkeys registered
        loginHistoryService.recordAttempt({
          userId: user.id,
          identifier: user.email,
          success: false,
          authMethod: "passkey",
          failureReason: "no_passkeys_registered",
          ipAddress,
          userAgent,
        });
        return null;
      }

      // Get role and permissions
      const { roleName, isSystemRole, permissions, apps } = await getUserPermissionsData(
        user.id,
        user.roleId,
      );

      // Create session
      const sessionId = await createSessionForUser(user.id);

      // Record successful passkey login
      loginHistoryService.recordAttempt({
        userId: user.id,
        userName: user.name,
        identifier: user.email,
        success: true,
        authMethod: "passkey",
        ipAddress,
        userAgent,
        sessionId,
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: roleName,
        roleId: user.roleId,
        isSystemRole,
        permissions,
        apps,
        twoFactorEnabled: false,
        twoFactorVerified: true,
        sessionId,
        authMethod: "passkey" as const,
        lastAuthAt: Date.now(),
      };
    } catch (error) {
      logger.error({ error, userId: credentials.userId }, "[Auth] Passkey authentication error");
      // Record failed passkey login - internal error
      // Try to get user info if available
      const errorUser = await userService
        .getUserById(credentials.userId as string)
        .catch(() => null);
      loginHistoryService.recordAttempt({
        userId: errorUser?.id,
        identifier: errorUser?.email ?? (credentials.userId as string),
        success: false,
        authMethod: "passkey",
        failureReason: "internal_error",
        ipAddress,
        userAgent,
      });
      return null;
    }
  },
});

/**
 * Handle Google OAuth sign-in
 * Validates the user exists and is linked, then populates user data
 */
export async function handleGoogleSignIn(
  user: { id?: string; email?: string | null; name?: string | null; image?: string | null },
  account: { providerAccountId?: string },
) {
  const { ipAddress, userAgent } = await getRequestMetadata();

  try {
    // Lazy import accountService (avoid circular deps at module load)
    const { accountService } = await import("@/services/runtime/account");

    // Check if this Google account is linked to any user
    const linkedAccount = await accountService.getAccountByProviderAccount(
      "google",
      account.providerAccountId!,
    );

    if (!linkedAccount) {
      logger.info(
        { providerAccountId: account.providerAccountId, email: user.email },
        "[Auth] Access denied: Google account not linked",
      );
      // Record failed Google login - not linked
      loginHistoryService.recordAttempt({
        identifier: user.email ?? undefined,
        success: false,
        authMethod: "google",
        failureReason: "google_not_linked",
        ipAddress,
        userAgent,
      });
      return "/admin/login?error=GoogleNotLinked";
    }

    // Get the linked user
    const existingUser = await userService.getUserById(linkedAccount.userId);

    if (!existingUser) {
      logger.info(
        { userId: linkedAccount.userId, email: user.email },
        "[Auth] Access denied: Linked user not found",
      );
      // Record failed Google login - user not found
      loginHistoryService.recordAttempt({
        identifier: user.email ?? undefined,
        success: false,
        authMethod: "google",
        failureReason: "user_not_found",
        ipAddress,
        userAgent,
      });
      return "/admin/login?error=UserNotFound";
    }

    if (!existingUser.isActive) {
      logger.info(
        { userId: existingUser.id, email: existingUser.email },
        "[Auth] Access denied: User account deactivated",
      );
      // Record failed Google login - account deactivated
      loginHistoryService.recordAttempt({
        userId: existingUser.id,
        identifier: existingUser.email,
        success: false,
        authMethod: "google",
        failureReason: "account_deactivated",
        ipAddress,
        userAgent,
      });
      return "/admin/login?error=AccessDenied";
    }

    // Verify email matches
    if (existingUser.email !== user.email) {
      logger.info(
        { googleEmail: user.email, userEmail: existingUser.email, userId: existingUser.id },
        "[Auth] Access denied: Google email mismatch",
      );
      // Record failed Google login - email mismatch
      loginHistoryService.recordAttempt({
        userId: existingUser.id,
        identifier: user.email ?? undefined,
        success: false,
        authMethod: "google",
        failureReason: "email_mismatch",
        ipAddress,
        userAgent,
      });
      return "/admin/login?error=EmailMismatch";
    }

    // Update user's name from Google if it changed (but preserve existing profile picture)
    if (existingUser.name !== user.name) {
      await userService.updateUser(existingUser.id, {
        name: user.name,
        emailVerified: existingUser.emailVerified || new Date(),
      });
    }

    // Set user data for the session
    user.id = existingUser.id;

    // Get role and permissions
    const { roleName, isSystemRole, permissions, apps } = await getUserPermissionsData(
      existingUser.id,
      existingUser.roleId,
    );

    const twoFactorEnabled = await twoFactorService.isEnabled(existingUser.id);
    const sessionId = await createSessionForUser(existingUser.id);

    // Record successful Google login
    loginHistoryService.recordAttempt({
      userId: existingUser.id,
      userName: existingUser.name,
      identifier: existingUser.email,
      success: true,
      authMethod: "google",
      ipAddress,
      userAgent,
      sessionId,
    });

    // Extend user object with additional properties
    const extendedUser = user as typeof user & {
      roleId: string | null;
      role: string;
      isSystemRole: boolean;
      permissions: string[];
      apps: string[];
      twoFactorEnabled: boolean;
      twoFactorVerified: boolean;
      sessionId: string | undefined;
      authMethod: "google";
      lastAuthAt: number;
    };

    extendedUser.roleId = existingUser.roleId;
    extendedUser.role = roleName;
    extendedUser.isSystemRole = isSystemRole;
    extendedUser.permissions = permissions;
    extendedUser.apps = apps;
    extendedUser.twoFactorEnabled = twoFactorEnabled;
    extendedUser.twoFactorVerified = true;
    extendedUser.sessionId = sessionId;
    extendedUser.authMethod = "google";
    extendedUser.lastAuthAt = Date.now();
    extendedUser.image = existingUser.image; // Use existing image

    return true;
  } catch (error) {
    logger.error({ error, email: user.email, userId: user.id }, "[Auth] Google sign in error");
    // Record failed Google login - internal error
    loginHistoryService.recordAttempt({
      identifier: user.email ?? undefined,
      success: false,
      authMethod: "google",
      failureReason: "internal_error",
      ipAddress,
      userAgent,
    });
    return false;
  }
}
