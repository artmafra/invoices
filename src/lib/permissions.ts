/**
 * Permission Functions
 *
 * This module contains functions that may have project imports.
 * Types and constants are imported from ./types.ts to avoid circular dependencies.
 */

import type { Session } from "next-auth";
import { AuthorizationResult, CoreAction, CoreResource } from "@/types/permissions/permissions";
import { auth } from "@/lib/auth";

/**
 * Check if a session has a specific permission.
 * Accepts both core resources (typed) and module resources (string).
 */
export function hasPermission(
  session: Session | null,
  resource: CoreResource | (string & {}),
  action: CoreAction | (string & {}),
): boolean {
  if (!session?.user?.permissions) {
    return false;
  }

  const permissionString = `${resource}.${action}`;
  return session.user.permissions.includes(permissionString);
}

/**
 * Check if a session has any of the specified permissions
 */
export function hasAnyPermission(
  session: Session | null,
  permissions: Array<{
    resource: CoreResource | (string & {});
    action: CoreAction | (string & {});
  }>,
): boolean {
  if (!session?.user?.permissions) {
    return false;
  }

  return permissions.some(({ resource, action }) =>
    session.user.permissions.includes(`${resource}.${action}`),
  );
}

/**
 * Check if a session has all of the specified permissions
 */
export function hasAllPermissions(
  session: Session | null,
  permissions: Array<{
    resource: CoreResource | (string & {});
    action: CoreAction | (string & {});
  }>,
): boolean {
  if (!session?.user?.permissions) {
    return false;
  }

  return permissions.every(({ resource, action }) =>
    session.user.permissions.includes(`${resource}.${action}`),
  );
}

/**
 * Require a specific permission for an API route.
 * Returns an AuthorizationResult indicating if authorized.
 * Accepts both core resources (typed) and module resources (string).
 */
export async function requirePermission(
  resource: CoreResource | (string & {}),
  action: CoreAction | (string & {}),
): Promise<AuthorizationResult & { session: Session | null }> {
  const session = await auth();

  // Check for missing user or expired session
  if (!session?.user || new Date(session.expires) < new Date()) {
    return {
      authorized: false,
      error: "Unauthorized",
      status: 401,
      session: null,
    };
  }

  if (!hasPermission(session, resource, action)) {
    return {
      authorized: false,
      error: "Forbidden - insufficient permissions",
      status: 403,
      session,
    };
  }

  return {
    authorized: true,
    session,
  };
}

/**
 * Require any of the specified permissions for an API route
 */
export async function requireAnyPermission(
  permissions: Array<{
    resource: CoreResource | (string & {});
    action: CoreAction | (string & {});
  }>,
): Promise<AuthorizationResult & { session: Session | null }> {
  const session = await auth();

  // Check for missing user or expired session
  if (!session?.user || new Date(session.expires) < new Date()) {
    return {
      authorized: false,
      error: "Unauthorized",
      status: 401,
      session: null,
    };
  }

  if (!hasAnyPermission(session, permissions)) {
    return {
      authorized: false,
      error: "Forbidden - insufficient permissions",
      status: 403,
      session,
    };
  }

  return {
    authorized: true,
    session,
  };
}

/**
 * Validate that a permission change doesn't lock out the user
 * Used when updating a user's role or role permissions
 */
export function wouldLoseCriticalPermission(
  currentPermissions: string[],
  newPermissions: string[],
  criticalPermission: string = "roles.edit",
): boolean {
  const hadPermission = currentPermissions.includes(criticalPermission);
  const willHavePermission = newPermissions.includes(criticalPermission);

  return hadPermission && !willHavePermission;
}

/**
 * Check if changing to a new role would be a self-demotion
 */
export function isSelfDemotion(currentPermissions: string[], newPermissions: string[]): boolean {
  // Check if losing roles.edit or roles.view
  const criticalPerms = ["roles.edit", "roles.view"];

  for (const perm of criticalPerms) {
    if (currentPermissions.includes(perm) && !newPermissions.includes(perm)) {
      return true;
    }
  }

  return false;
}

/**
 * Helper to format permission for display
 */
export function formatPermission(resource: string, action: string): string {
  return `${resource}.${action}`;
}

/**
 * Parse a permission string into resource and action
 */
export function parsePermission(permissionString: string): {
  resource: string;
  action: string;
} | null {
  const parts = permissionString.split(".");
  if (parts.length !== 2) {
    return null;
  }
  return { resource: parts[0], action: parts[1] };
}
