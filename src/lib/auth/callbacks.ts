import type { Account, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { logger } from "@/lib/logger";
import { userSessionService } from "@/services/runtime/user-session";
import { handleGoogleSignIn } from "./providers";
import { verifyAndConsumeToken } from "./session-token";

// Session sliding window constants
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes
const SLIDING_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * JWT callback - handles token creation and updates
 *
 * SECURITY: Session updates are restricted to prevent privilege escalation.
 * Sensitive fields (role, permissions, apps) can only be updated via:
 * 1. Initial sign-in (server-verified credentials)
 * 2. Token-verified operations (impersonation, refresh)
 *
 * Safe fields that can be updated directly:
 * - image, name, email (profile data)
 */
export async function jwtCallback({
  token,
  user,
  trigger,
  session,
}: {
  token: JWT;
  user?: User;
  trigger?: "signIn" | "signUp" | "update";
  session?: Record<string, unknown>;
}): Promise<JWT | null> {
  // Initial sign-in: populate token from user object
  if (user) {
    token.role = user.role;
    token.roleId = user.roleId;
    token.isSystemRole = user.isSystemRole;
    token.permissions = user.permissions;
    token.apps = user.apps;
    token.twoFactorEnabled = user.twoFactorEnabled;
    token.twoFactorVerified = user.twoFactorVerified;
    token.image = user.image;
    token.sessionId = user.sessionId;
    token.authMethod = user.authMethod;
    token.lastAuthAt = user.lastAuthAt;
    token.stepUpAuthAt = user.stepUpAuthAt;
  }

  // Session validation and activity tracking
  if (token.sessionId) {
    const sessionId = token.sessionId as string;

    try {
      const sessionRow = await userSessionService.getSessionById(sessionId);

      if (!sessionRow || sessionRow.isRevoked || new Date() > sessionRow.expiresAt) {
        logger.info(
          {
            sessionId,
            isRevoked: sessionRow?.isRevoked,
            expired: sessionRow && new Date() > sessionRow.expiresAt,
          },
          "[Auth] Session revoked/expired, forcing sign-out",
        );
        return null;
      }

      // Check if user is still active (fail closed on deactivation)
      if (token.sub) {
        const userService = (await import("@/services/runtime/user")).userService;
        const isActive = await userService.isUserActive(token.sub);

        if (!isActive) {
          logger.info(
            { userId: token.sub, sessionId },
            "[Auth] User deactivated or deleted, forcing sign-out",
          );
          return null;
        }
      }

      // Check absolute expiry (cannot be extended)
      const now = new Date();
      if (sessionRow.absoluteExpiresAt && now > sessionRow.absoluteExpiresAt) {
        logger.info(
          {
            userId: token.sub,
            sessionId,
            absoluteExpiresAt: sessionRow.absoluteExpiresAt,
          },
          "[Auth] Session past absolute lifetime, forcing sign-out",
        );
        return null;
      }

      // Update activity timestamp (throttled)
      const lastActivityAt = sessionRow.lastActivityAt ?? sessionRow.createdAt;
      const shouldTouch =
        !lastActivityAt || now.getTime() - lastActivityAt.getTime() >= ACTIVITY_THROTTLE_MS;

      if (shouldTouch) {
        const proposedExpiresAt = new Date(now.getTime() + SLIDING_WINDOW_MS);

        // Cap at absolute expiry if set
        let nextExpiresAt =
          sessionRow.expiresAt && sessionRow.expiresAt > proposedExpiresAt
            ? sessionRow.expiresAt
            : proposedExpiresAt;

        if (sessionRow.absoluteExpiresAt && nextExpiresAt > sessionRow.absoluteExpiresAt) {
          nextExpiresAt = sessionRow.absoluteExpiresAt;
        }

        await userSessionService.touchSessionById(sessionId, {
          lastActivityAt: now,
          expiresAt: nextExpiresAt,
        });
      }
    } catch (error) {
      logger.error({ error, sessionId }, "[Auth] Error checking/touching session");
    }
  }

  // Handle session updates
  if (trigger === "update" && session) {
    await handleSessionUpdate(token, session);
  }

  return token;
}

/**
 * Handle session.update() calls securely
 *
 * Only allows:
 * 1. Safe profile fields (image, name, email, preferences)
 * 2. Token-verified sensitive operations (impersonation, step-up auth)
 */
async function handleSessionUpdate(token: JWT, session: Record<string, unknown>): Promise<void> {
  const userId = token.sub!;

  // === TOKEN-VERIFIED OPERATIONS ===
  // These require a server-generated token to prevent client-side abuse

  // Handle impersonation start (requires valid token)
  if (session._impersonateToken && session.impersonate) {
    const tokenData = await verifyAndConsumeToken(
      session._impersonateToken as string,
      "impersonate",
      userId,
    );

    if (tokenData && tokenData.targetUserId) {
      // Token valid - apply impersonation from verified payload
      const payload = tokenData.payload as {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        role: string;
        roleId: string | null;
        isSystemRole: boolean;
        permissions: string[];
        apps: string[];
      };

      logger.info(
        {
          originalUserId: userId,
          targetUserId: tokenData.targetUserId,
          targetName: payload.name,
        },
        "[Auth] Applying impersonation to JWT",
      );

      token.impersonatedBy = {
        id: userId,
        name: (token.name as string) || null,
        email: token.email!,
      };
      token.sub = payload.id;
      token.name = payload.name;
      token.email = payload.email;
      token.image = payload.image;
      token.role = payload.role;
      token.roleId = payload.roleId;
      token.isSystemRole = payload.isSystemRole;
      token.permissions = payload.permissions;
      token.apps = payload.apps;

      logger.info(
        { newTokenSub: token.sub, impersonatedBy: token.impersonatedBy },
        "[Auth] Impersonation applied successfully",
      );
    } else {
      logger.error(
        { userId, hasToken: !!session._impersonateToken, hasTokenData: !!tokenData },
        "[Auth] Invalid impersonation token",
      );
    }
    return;
  }

  // Handle impersonation end (requires valid token)
  if (session._endImpersonationToken && session.endImpersonation) {
    const originalUserId = (token.impersonatedBy as { id: string } | undefined)?.id;

    if (!originalUserId) {
      logger.warn({ userId }, "[Auth] End impersonation requested but not impersonating");
      return;
    }

    const tokenData = await verifyAndConsumeToken(
      session._endImpersonationToken as string,
      "end-impersonation",
      originalUserId, // Token was created by the original admin
    );

    if (tokenData) {
      // Token valid - restore original user from verified payload
      const payload = tokenData.payload as {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        role: string;
        roleId: string | null;
        isSystemRole: boolean;
        permissions: string[];
        apps: string[];
      };

      token.sub = payload.id;
      token.name = payload.name;
      token.email = payload.email;
      token.image = payload.image;
      token.role = payload.role;
      token.roleId = payload.roleId;
      token.isSystemRole = payload.isSystemRole;
      token.permissions = payload.permissions;
      token.apps = payload.apps;
      token.impersonatedBy = undefined;
    } else {
      logger.warn({ userId: originalUserId }, "[Auth] Invalid end-impersonation token");
    }
    return;
  }

  // Handle step-up auth (requires valid token)
  if (session._stepUpToken && session.stepUpAuthAt !== undefined) {
    const tokenData = await verifyAndConsumeToken(
      session._stepUpToken as string,
      "step-up",
      userId,
    );

    if (tokenData) {
      token.stepUpAuthAt = tokenData.payload.stepUpAuthAt as number;
    } else {
      logger.warn({ userId }, "[Auth] Invalid step-up auth token");
    }
    return;
  }

  // Handle permission refresh (requires valid token)
  // This is used after role changes, app access changes, etc.
  if (session._refreshPermissionsToken) {
    const tokenData = await verifyAndConsumeToken(
      session._refreshPermissionsToken as string,
      "refresh-permissions",
      userId,
    );

    if (tokenData) {
      const payload = tokenData.payload as {
        role?: string;
        roleId?: string | null;
        isSystemRole?: boolean;
        permissions?: string[];
        apps?: string[];
      };

      if (payload.role !== undefined) token.role = payload.role;
      if (payload.roleId !== undefined) token.roleId = payload.roleId;
      if (payload.isSystemRole !== undefined) token.isSystemRole = payload.isSystemRole;
      if (payload.permissions !== undefined) token.permissions = payload.permissions;
      if (payload.apps !== undefined) token.apps = payload.apps;
    } else {
      logger.warn({ userId }, "[Auth] Invalid refresh-permissions token");
    }
    return;
  }

  // === SAFE FIELDS ===
  // These can be updated directly from client without token verification
  // They don't affect authorization decisions

  if (session.image !== undefined) {
    token.image = session.image as string | null;
  }

  if (session.name) {
    token.name = session.name as string;
  }

  if (session.email) {
    token.email = session.email as string;
  }

  // === BLOCKED FIELDS ===
  // These are silently ignored to prevent privilege escalation
  // Uncomment the warnings below for debugging during development
  //
  // if (session.role !== undefined) {
  //   console.warn(`Blocked attempt to set role via session.update() by user ${userId}`);
  // }
  // if (session.permissions !== undefined) {
  //   console.warn(`Blocked attempt to set permissions via session.update() by user ${userId}`);
  // }
  // if (session.apps !== undefined) {
  //   console.warn(`Blocked attempt to set apps via session.update() by user ${userId}`);
  // }
  // if (session.impersonate !== undefined && !session._impersonateToken) {
  //   console.warn(`Blocked impersonation attempt without token by user ${userId}`);
  // }
}

/**
 * Session callback - builds the session object from the token
 */
export function sessionCallback({ session, token }: { session: Session; token: JWT }): Session {
  if (token && session.user) {
    session.user.id = token.sub!;
    session.user.role = token.role as string;
    session.user.roleId = token.roleId as string | null;
    session.user.isSystemRole = token.isSystemRole as boolean;
    session.user.permissions = (token.permissions as string[]) || [];
    session.user.apps = (token.apps as string[]) || [];
    session.user.twoFactorEnabled = token.twoFactorEnabled as boolean | undefined;
    session.user.twoFactorVerified = token.twoFactorVerified as boolean | undefined;
    session.user.image = token.image as string;
    session.sessionId = token.sessionId as string | undefined;
    session.user.authMethod = token.authMethod;
    session.user.lastAuthAt = token.lastAuthAt;
    session.user.stepUpAuthAt = token.stepUpAuthAt;

    // Pass through impersonation info
    if (token.impersonatedBy) {
      session.user.impersonatedBy = token.impersonatedBy as {
        id: string;
        name: string | null;
        email: string;
      };
    }
  }
  return session;
}

/**
 * Sign-in callback - handles provider-specific sign-in logic
 */
export async function signInCallback({
  user,
  account,
}: {
  user: User;
  account?: Account | null;
}): Promise<boolean | string> {
  if (account?.provider === "google") {
    return handleGoogleSignIn(user, account);
  }

  return true;
}
