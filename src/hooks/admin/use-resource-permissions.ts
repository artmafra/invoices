"use client";

import { useSessionContext } from "@/contexts/session-context";

/**
 * User permissions for the users resource
 */
export interface UserPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canManageAppAccess: boolean;
  canViewRoles: boolean;
  canImpersonate: boolean;
}

/**
 * Role permissions for the roles resource
 */
export interface RolePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewPermissions: boolean;
}

/**
 * Task permissions for the tasks resource
 */
export interface TaskPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewLists: boolean;
}

/**
 * Note permissions for the notes resource
 */
export interface NotePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Invoice permissions for the invoices resource
 */
export interface InvoicePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Game permissions for the games resource
 */
export interface GamePermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * Task list permissions for the task-lists resource
 */
export interface TaskListPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
}

/**
 * Session permissions for the sessions resource
 */
export interface SessionPermissions {
  canView: boolean;
  canRevoke: boolean;
}

/**
 * Activity permissions for the activity resource
 */
export interface ActivityPermissions {
  canView: boolean;
  canVerify: boolean;
}

/**
 * Settings permissions for the settings resource
 */
export interface SettingsPermissions {
  canView: boolean;
  canEdit: boolean;
}

/**
 * Hook to extract typed permissions for the users resource
 * Eliminates repetitive permission checking boilerplate
 */
export interface UserPermissionsWithContext extends UserPermissions {
  currentUserId: string | undefined;
  isLoading: boolean;
}

export function useUserPermissions(): UserPermissionsWithContext {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;

  return {
    canCreate: permissions.includes("users.create"),
    canEdit: permissions.includes("users.edit"),
    canDelete: permissions.includes("users.delete"),
    canActivate: permissions.includes("users.activate"),
    canManageAppAccess: permissions.includes("users.app-permissions"),
    canViewRoles: permissions.includes("roles.view"),
    canImpersonate: session?.user?.role === "system",
    currentUserId,
    isLoading: status === "loading",
  };
}

/**
 * Hook to extract typed permissions for the roles resource
 * Eliminates repetitive permission checking boilerplate
 */
export interface RolePermissionsWithContext extends RolePermissions {
  currentUserId: string | undefined;
  currentUserRoleId: string | undefined;
  currentUserPermissions: string[];
  isLoading: boolean;
}

export function useRolePermissions(): RolePermissionsWithContext {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;
  const currentUserRoleId = session?.user?.roleId || undefined;

  return {
    canCreate: permissions.includes("roles.create"),
    canEdit: permissions.includes("roles.edit"),
    canDelete: permissions.includes("roles.delete"),
    canViewPermissions: permissions.includes("permissions.view"),
    currentUserId,
    currentUserRoleId,
    currentUserPermissions: permissions,
    isLoading: status === "loading",
  };
}

/**
 * Hook to extract typed permissions for the tasks resource
 */
export function useTaskPermissions(): TaskPermissions & {
  currentUserId: string | undefined;
  isLoading: boolean;
} {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;

  return {
    canCreate: permissions.includes("tasks.create"),
    canEdit: permissions.includes("tasks.edit"),
    canDelete: permissions.includes("tasks.delete"),
    canViewLists: permissions.includes("task-lists.view"),
    currentUserId,
    isLoading: status === "loading",
  };
}

/**
 * Hook to extract typed permissions for the notes resource
 */
export function useNotePermissions(): NotePermissions & {
  currentUserId: string | undefined;
  isLoading: boolean;
} {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;

  return {
    canCreate: permissions.includes("notes.create"),
    canEdit: permissions.includes("notes.edit"),
    canDelete: permissions.includes("notes.delete"),
    currentUserId,
    isLoading: status === "loading",
  };
}

export function useInvoicePermissions(): InvoicePermissions & {
  currentUserId: string | undefined;
  isLoading: boolean;
} {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;

  return {
    canCreate: permissions.includes("invoices.create"),
    canEdit: permissions.includes("invoices.edit"),
    canDelete: permissions.includes("invoices.delete"),
    currentUserId,
    isLoading: status === "loading",
  };
}

/**
 * Hook to extract typed permissions for the games resource
 */
export function useGamePermissions(): GamePermissions & {
  currentUserId: string | undefined;
  isLoading: boolean;
} {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;

  return {
    canCreate: permissions.includes("games.create"),
    canEdit: permissions.includes("games.edit"),
    canDelete: permissions.includes("games.delete"),
    currentUserId,
    isLoading: status === "loading",
  };
}

/**
 * Hook to extract typed permissions for the task-lists resource
 */
export function useTaskListPermissions(): TaskListPermissions & {
  currentUserId: string | undefined;
  isLoading: boolean;
} {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;

  return {
    canCreate: permissions.includes("tasks.create"),
    canEdit: permissions.includes("tasks.edit"),
    canDelete: permissions.includes("tasks.delete"),
    canView: permissions.includes("tasks.view"),
    currentUserId,
    isLoading: status === "loading",
  };
}

/**
 * Hook to extract typed permissions for the sessions resource
 */
export function useSessionPermissions(): SessionPermissions & {
  currentUserId: string | undefined;
  currentSessionId: string | undefined;
  isLoading: boolean;
} {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;
  const currentSessionId = session?.sessionId;

  return {
    canView: permissions.includes("sessions.view"),
    canRevoke: permissions.includes("sessions.revoke"),
    currentUserId,
    currentSessionId,
    isLoading: status === "loading",
  };
}

/**
 * Hook to extract typed permissions for the activity resource
 */
export function useActivityPermissions(): ActivityPermissions & {
  currentUserId: string | undefined;
  isLoading: boolean;
} {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;

  return {
    canView: permissions.includes("activity.view"),
    canVerify: permissions.includes("activity.verify"),
    currentUserId,
    isLoading: status === "loading",
  };
}

/**
 * Hook to extract typed permissions for the settings resource
 */
export function useSettingsPermissions(): SettingsPermissions & {
  currentUserId: string | undefined;
  isLoading: boolean;
} {
  const { session, status } = useSessionContext();
  const permissions = session?.user?.permissions || [];
  const currentUserId = session?.user?.id;

  return {
    canView: permissions.includes("settings.view"),
    canEdit: permissions.includes("settings.edit"),
    currentUserId,
    isLoading: status === "loading",
  };
}
