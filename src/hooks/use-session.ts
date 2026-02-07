"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useSessionContext } from "@/contexts/session-context";
import { signOut } from "next-auth/react";

// Stable empty array to prevent infinite re-renders
const EMPTY_PERMISSIONS: string[] = [];

/**
 * Hook for accessing current session state and user role information
 */
export function useUserSession() {
  const { session, status } = useSessionContext();

  // Check if session was invalidated (revoked)
  const isSessionInvalid = session && !session.user;

  // Redirect to login if session was invalidated
  useEffect(() => {
    if (isSessionInvalid) {
      signOut({ callbackUrl: "/admin/login" });
    }
  }, [isSessionInvalid]);

  // Use stable reference for permissions
  const permissions = useMemo(
    () => session?.user?.permissions || EMPTY_PERMISSIONS,
    [session?.user?.permissions],
  );

  /**
   * Check if the current user has a specific permission
   */
  const hasPermission = useCallback(
    (resource: string, action: string): boolean => {
      if (permissions.length === 0) return false;
      const permission = `${resource}.${action}`;
      return permissions.includes(permission);
    },
    [permissions],
  );

  /**
   * Check if the current user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (perms: Array<{ resource: string; action: string }>): boolean => {
      if (permissions.length === 0) return false;
      return perms.some(({ resource, action }) => permissions.includes(`${resource}.${action}`));
    },
    [permissions],
  );

  /**
   * Check if the current user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (perms: Array<{ resource: string; action: string }>): boolean => {
      if (permissions.length === 0) return false;
      return perms.every(({ resource, action }) => permissions.includes(`${resource}.${action}`));
    },
    [permissions],
  );

  return {
    user: session?.user,
    loading: status === "loading",
    authenticated: !!session?.user,
    permissions,
    // Permission check helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    // Backward compatibility - check if user has admin-level permissions
    isAdmin: permissions.includes("users.create"),
    isUser: !!session?.user && !permissions.includes("users.create"),
    // Impersonation state
    isImpersonating: !!session?.user?.impersonatedBy,
    impersonatedBy: session?.user?.impersonatedBy,
  };
}

/**
 * Hook that requires authentication - redirects to login if not authenticated
 */
export function useRequireSession() {
  const {
    user,
    loading,
    authenticated,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
  } = useUserSession();

  // Handle redirect when not authenticated
  useEffect(() => {
    if (!loading && !authenticated) {
      window.location.href = "/admin/login";
    }
  }, [loading, authenticated]);

  if (loading) {
    return {
      user: null,
      loading: true,
      authenticated: false,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      permissions: [],
    };
  }

  if (!authenticated) {
    // Return loading-like state while redirect happens
    return {
      user: null,
      loading: true,
      authenticated: false,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      permissions: [],
    };
  }

  return {
    user,
    loading: false,
    authenticated: true,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
  };
}

// Backward compatibility aliases
export const useAuth = useUserSession;
export const useRequireAuth = useRequireSession;
