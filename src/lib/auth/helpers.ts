import { headers } from "next/headers";
import { logger } from "@/lib/logger";
import { userService } from "@/services/runtime/user";
import { userSessionService } from "@/services/runtime/user-session";

/**
 * Get request metadata for session tracking
 */
export async function getRequestMetadata() {
  try {
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() || realIp || undefined;
    return { userAgent, ipAddress };
  } catch {
    return { userAgent: undefined, ipAddress: undefined };
  }
}

/**
 * Create a session for a user and return the session ID
 */
export async function createSessionForUser(userId: string): Promise<string | undefined> {
  try {
    const { userAgent, ipAddress } = await getRequestMetadata();
    const session = await userSessionService.createSession({ userId, userAgent, ipAddress });
    // Update last login timestamp
    await userService.updateLastLoginAt(userId);
    return session.id;
  } catch (error) {
    logger.error({ error, userId }, "[Auth] Failed to create session");
    return undefined;
  }
}

/**
 * Get user's role, permissions, and app access
 * Used by multiple auth providers to build the user object
 */
export async function getUserPermissionsData(userId: string, roleId: string | null) {
  const [{ roleService }, { permissionService }, { appPermissionsService }] = await Promise.all([
    import("@/services/runtime/role"),
    import("@/services/runtime/permission"),
    import("@/services/runtime/app-permissions"),
  ]);

  let roleName = "user";
  let isSystemRole = false;
  let rolePermissions: string[] = [];

  if (roleId) {
    const role = await roleService.getRoleById(roleId);
    if (role) {
      roleName = role.name;
      isSystemRole = role.isSystem;
    }
    rolePermissions = await permissionService.getUserPermissions(userId);
  }

  // Get app permissions and merge with role permissions
  const appPermissionsResult = await appPermissionsService.getUserAppPermissionsResult(userId);
  const permissions = [...rolePermissions, ...appPermissionsResult.permissions];
  const apps = appPermissionsResult.apps;

  return {
    roleName,
    isSystemRole,
    permissions,
    apps,
  };
}
