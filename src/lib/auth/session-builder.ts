import type { Session } from "@/types/auth/session.types";
import type { AuthMethod } from "@/types/auth/step-up-auth.types";
import { logger } from "@/lib/logger";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";
import { getUserPermissionsData } from "./helpers";

// Last-activity writes are throttled to avoid a DB write on every request
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000;

interface SessionRow {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  absoluteExpiresAt?: Date | null;
  stepUpAuthAt?: Date | null;
  authMethod?: string | null;
  impersonatedUserId?: string | null;
}

/**
 * Builds the application session from a valid Better Auth session row.
 *
 * Returns null when the session must no longer be honoured (absolute lifetime
 * exceeded, user deactivated or deleted). Role, permissions and app access are
 * resolved here on every call, so changes take effect without re-login.
 */
export async function buildAppSession(sessionRow: SessionRow): Promise<Session | null> {
  const now = new Date();

  if (sessionRow.absoluteExpiresAt && now > sessionRow.absoluteExpiresAt) {
    logger.info({ sessionId: sessionRow.id }, "[Auth] Session past absolute lifetime");
    await userSessionService.revokeSession(sessionRow.id, "Absolute lifetime exceeded");
    return null;
  }

  const owner = await userService.getUserById(sessionRow.userId);

  // Fail closed on deactivation/deletion
  if (!owner || !owner.isActive) {
    logger.info({ userId: sessionRow.userId }, "[Auth] User deactivated or deleted");
    await userSessionService.revokeSession(sessionRow.id, "User deactivated");
    return null;
  }

  let effectiveUser = owner;
  let impersonatedBy: Session["user"]["impersonatedBy"];

  if (sessionRow.impersonatedUserId) {
    const target = await userService.getUserById(sessionRow.impersonatedUserId);
    if (target?.isActive) {
      effectiveUser = target;
      impersonatedBy = { id: owner.id, name: owner.name, email: owner.email };
    } else {
      await userSessionService.setImpersonatedUser(sessionRow.id, null);
    }
  }

  if (now.getTime() - sessionRow.updatedAt.getTime() >= ACTIVITY_THROTTLE_MS) {
    try {
      await userSessionService.touchSessionById(sessionRow.id, {
        lastActivityAt: now,
        expiresAt: userSessionService.getSlidingExpiry(
          {
            expiresAt: sessionRow.expiresAt,
            absoluteExpiresAt: sessionRow.absoluteExpiresAt ?? null,
          },
          now,
        ),
      });
    } catch (error) {
      logger.error({ error, sessionId: sessionRow.id }, "[Auth] Error touching session");
    }
  }

  const { roleName, isSystemRole, permissions, apps } = await getUserPermissionsData(
    effectiveUser.id,
    effectiveUser.roleId,
  );

  return {
    user: {
      id: effectiveUser.id,
      name: effectiveUser.name,
      email: effectiveUser.email,
      image: effectiveUser.image,
      role: roleName,
      roleId: effectiveUser.roleId,
      isSystemRole,
      permissions,
      apps,
      sessionId: sessionRow.id,
      impersonatedBy,
      authMethod: (sessionRow.authMethod as AuthMethod | null) ?? undefined,
      lastAuthAt: sessionRow.createdAt.getTime(),
      stepUpAuthAt: sessionRow.stepUpAuthAt?.getTime(),
    },
    sessionId: sessionRow.id,
    expires: sessionRow.expiresAt.toISOString(),
  };
}
