import { headers } from "next/headers";
import { getClientIpFromHeaders } from "@/lib/rate-limit";

interface HeaderReader {
  get(name: string): string | null;
}

/**
 * Client metadata (user agent + IP) from a set of request headers
 */
export function getMetadataFromHeaders(headerReader: HeaderReader | null | undefined) {
  if (!headerReader) return { userAgent: undefined, ipAddress: undefined };
  const userAgent = headerReader.get("user-agent") || undefined;
  const clientIp = getClientIpFromHeaders(headerReader);
  const ipAddress = clientIp === "unknown" ? undefined : clientIp;
  return { userAgent, ipAddress };
}

/**
 * Get request metadata from the current Next.js request
 */
export async function getRequestMetadata() {
  try {
    return getMetadataFromHeaders(await headers());
  } catch {
    return { userAgent: undefined, ipAddress: undefined };
  }
}

/**
 * Get user's role, permissions, and app access
 * Used to build the application session
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

  // Auto-grant access to the "invoices" app if the user has any related role permission
  const invoicesResources = ["invoices.", "companies.", "suppliers.", "services."];
  const hasInvoicesAccess = permissions.some((p) =>
    invoicesResources.some((prefix) => p.startsWith(prefix)),
  );
  const apps =
    appPermissionsResult.apps.includes("invoices") || !hasInvoicesAccess
      ? appPermissionsResult.apps
      : [...appPermissionsResult.apps, "invoices"];

  return {
    roleName,
    isSystemRole,
    permissions,
    apps,
  };
}
