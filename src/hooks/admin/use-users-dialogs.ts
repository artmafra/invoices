"use client";

import { useState } from "react";
import type { AdminUserResponse } from "@/types/users/users.types";

/**
 * Dialog state for users management
 * Consolidates separate state variables into a single hook (Finding #10)
 */
export interface UsersDialogState {
  // Create dialog
  showCreateDialog: boolean;

  // Invite dialog
  showInviteDialog: boolean;

  // Edit dialog
  editingUser: AdminUserResponse | null;
  editAppPermissions: Record<string, string[]>;

  // Confirmation dialogs
  userToDelete: AdminUserResponse | null;
  userToToggleStatus: AdminUserResponse | null;
  userToImpersonate: AdminUserResponse | null;
  userToUnlock: AdminUserResponse | null;
}

/**
 * Hook to manage all user dialog states and their open/close handlers
 * Reduces modal state complexity from 13 separate useState calls to 1 hook
 */
export function useUsersDialogs() {
  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Invite dialog state
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Edit dialog state
  const [editingUser, setEditingUser] = useState<AdminUserResponse | null>(null);
  const [editAppPermissions, setEditAppPermissions] = useState<Record<string, string[]>>({});

  // Confirmation dialog states
  const [userToDelete, setUserToDelete] = useState<AdminUserResponse | null>(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState<AdminUserResponse | null>(null);
  const [userToImpersonate, setUserToImpersonate] = useState<AdminUserResponse | null>(null);
  const [userToUnlock, setUserToUnlock] = useState<AdminUserResponse | null>(null);

  return {
    // State
    dialogs: {
      showCreateDialog,
      showInviteDialog,
      editingUser,
      editAppPermissions,
      userToDelete,
      userToToggleStatus,
      userToImpersonate,
      userToUnlock,
    },

    // State setters (for controlled components)
    setEditAppPermissions,

    // Create dialog actions
    openCreateDialog: () => setShowCreateDialog(true),
    closeCreateDialog: () => {
      setShowCreateDialog(false);
    },

    // Invite dialog actions
    openInviteDialog: () => setShowInviteDialog(true),
    closeInviteDialog: () => {
      setShowInviteDialog(false);
    },

    // Edit dialog actions
    openEditDialog: (user: AdminUserResponse) => {
      setEditingUser(user);
      // App permissions will be fetched via useUserAppPermissions hook
      setEditAppPermissions({});
    },
    closeEditDialog: () => {
      setEditingUser(null);
      setEditAppPermissions({});
    },

    // Delete confirmation actions
    openDeleteConfirm: (user: AdminUserResponse) => setUserToDelete(user),
    closeDeleteConfirm: () => setUserToDelete(null),

    // Toggle status confirmation actions
    openToggleStatusConfirm: (user: AdminUserResponse) => setUserToToggleStatus(user),
    closeToggleStatusConfirm: () => setUserToToggleStatus(null),

    // Impersonate confirmation actions
    openImpersonateConfirm: (user: AdminUserResponse) => setUserToImpersonate(user),
    closeImpersonateConfirm: () => setUserToImpersonate(null),

    // Unlock confirmation actions
    openUnlockConfirm: (user: AdminUserResponse) => setUserToUnlock(user),
    closeUnlockConfirm: () => setUserToUnlock(null),

    // Close all dialogs (utility)
    closeAll: () => {
      setShowCreateDialog(false);
      setShowInviteDialog(false);
      setEditingUser(null);
      setUserToDelete(null);
      setUserToToggleStatus(null);
      setUserToImpersonate(null);
      setUserToUnlock(null);
    },
  };
}
