import { useState } from "react";
import type { RoleResponse } from "@/types/common/roles.types";

export interface RolesDialogState {
  // Create dialog
  showCreateDialog: boolean;
  // Edit dialog
  editingRole: RoleResponse | null;
  // Delete confirmation
  roleToDelete: RoleResponse | null;
}

/**
 * Custom hook for managing roles dialog states
 * Consolidates create, edit, and delete dialog management
 *
 * @returns Dialog states and functions to open/close dialogs
 */
export function useRolesDialogs() {
  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Edit dialog state
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);

  // Delete confirmation state
  const [roleToDelete, setRoleToDelete] = useState<RoleResponse | null>(null);

  // Open/close functions
  const openCreateDialog = () => setShowCreateDialog(true);
  const closeCreateDialog = () => setShowCreateDialog(false);

  const openEditDialog = (role: RoleResponse) => setEditingRole(role);
  const closeEditDialog = () => setEditingRole(null);

  const openDeleteConfirm = (role: RoleResponse) => setRoleToDelete(role);
  const closeDeleteConfirm = () => setRoleToDelete(null);

  return {
    // Dialog states
    dialogs: {
      showCreateDialog,
      editingRole,
      roleToDelete,
    },
    // Open/close functions
    openCreateDialog,
    closeCreateDialog,
    openEditDialog,
    closeEditDialog,
    openDeleteConfirm,
    closeDeleteConfirm,
  };
}
