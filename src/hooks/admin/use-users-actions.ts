"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { CreateUserInviteRequest } from "@/types/users/user-invites.types";
import type { CreateUserRequest, UpdateUserRequest } from "@/types/users/users.types";
import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type { UserPermissionsWithContext } from "./use-resource-permissions";
import { useCancelUserInvite, useCreateUserInvite, useResendUserInvite } from "./use-user-invite";
import {
  useCreateUser,
  usePermanentlyDeleteUser,
  useStartImpersonation,
  useToggleUserStatus,
  useUnlockUser,
  useUpdateUser,
  useUpdateUserAppPermissions,
  useUserAppPermissions,
} from "./use-users";
import type { UsersDialogState } from "./use-users-dialogs";

/**
 * Hook parameters for user actions
 */
export interface UseUsersActionsParams {
  permissions: UserPermissionsWithContext;
  dialogs: UsersDialogState;
  closeCreateDialog: () => void;
  closeInviteDialog: () => void;
  closeEditDialog: () => void;
  closeDeleteConfirm: () => void;
  closeToggleStatusConfirm: () => void;
  closeImpersonateConfirm: () => void;
  closeUnlockConfirm: () => void;
  _setEditAppPermissions: (permissions: Record<string, string[]>) => void;
}

/**
 * Hook to manage all user-related actions and mutations
 * Consolidates 10+ mutation handlers from the page component
 */
export function useUsersActions({
  permissions,
  dialogs,
  closeCreateDialog,
  closeInviteDialog,
  closeEditDialog,
  closeDeleteConfirm,
  closeToggleStatusConfirm,
  closeImpersonateConfirm,
  closeUnlockConfirm,
  _setEditAppPermissions,
}: UseUsersActionsParams) {
  const t = useTranslations("system.users");
  const tc = useTranslations("common");

  // Mutations
  const createUserMutation = useCreateUser();
  const createInviteMutation = useCreateUserInvite();
  const cancelInviteMutation = useCancelUserInvite();
  const resendInviteMutation = useResendUserInvite();
  const toggleUserStatusMutation = useToggleUserStatus();
  const permanentlyDeleteUserMutation = usePermanentlyDeleteUser();
  const unlockUserMutation = useUnlockUser();
  const updateUserMutation = useUpdateUser();
  const updateAppPermissionsMutation = useUpdateUserAppPermissions();
  const startImpersonationMutation = useStartImpersonation();

  // Fetch app permissions for the user being edited
  const { data: editingUserAppPermissions } = useUserAppPermissions(
    dialogs.editingUser?.id ?? null,
  );

  // Sync app permissions state when editing user's permissions are fetched
  // This effect is handled in the parent component via setEditAppPermissions

  /**
   * Create user handler
   */
  const handleCreateUser = withPermissionGuard(
    permissions.canCreate,
    t("errors.noCreatePermission"),
    async (data: CreateUserRequest) => {
      await createUserMutation.mutateAsync(data);
      closeCreateDialog();
    },
  );

  /**
   * Invite user handler
   */
  const handleInviteUser = withPermissionGuard(
    permissions.canCreate,
    t("errors.noInvitePermission"),
    async (data: CreateUserInviteRequest) => {
      await createInviteMutation.mutateAsync(data);
      closeInviteDialog();
    },
  );

  /**
   * Cancel invite handler
   * Uses optimistic updates - fires mutation immediately
   */
  const handleCancelInvite = withPermissionGuard(
    permissions.canCreate,
    t("errors.noCancelPermission"),
    (inviteId: string) => {
      // Fire mutation (optimistic update removes invite immediately)
      cancelInviteMutation.mutate(inviteId);
    },
  );

  /**
   * Resend invite handler
   */
  const handleResendInvite = withPermissionGuard(
    permissions.canCreate,
    t("errors.noResendPermission"),
    async (inviteId: string) => {
      await resendInviteMutation.mutateAsync(inviteId);
    },
  );

  /**
   * Confirm toggle user status handler
   * Uses optimistic updates - closes dialog immediately for instant feedback
   */
  const handleConfirmToggleUserStatus = () => {
    const user = dialogs.userToToggleStatus;
    if (!user) return;

    // Close dialog immediately for instant feedback
    closeToggleStatusConfirm();

    // Fire mutation (optimistic update + rollback handles errors)
    toggleUserStatusMutation.mutate({
      userId: user.id,
      action: user.isActive ? "deactivate" : "activate",
    });
  };

  /**
   * Confirm permanently delete user handler
   */
  const handleConfirmPermanentlyDeleteUser = async () => {
    const user = dialogs.userToDelete;
    if (!user) return;

    try {
      await permanentlyDeleteUserMutation.mutateAsync(user.id);
      closeDeleteConfirm();
    } catch {
      // Error is already handled by the hook
    }
  };

  /**
   * Confirm start impersonation handler
   */
  const handleConfirmStartImpersonation = async () => {
    const user = dialogs.userToImpersonate;
    if (!user) return;

    try {
      await startImpersonationMutation.mutateAsync(user.id);
      closeImpersonateConfirm();
    } catch {
      // Error is already handled by the hook
    }
  };

  /**
   * Confirm unlock user handler
   */
  const handleConfirmUnlockUser = async () => {
    const user = dialogs.userToUnlock;
    if (!user) return;

    try {
      await unlockUserMutation.mutateAsync(user.id);
      closeUnlockConfirm();
    } catch {
      // Error is already handled by the hook
    }
  };

  /**
   * Edit user submit handler (complex logic with profile + app permissions)
   */
  const handleEditUser = withPermissionGuard(
    permissions.canEdit && !!dialogs.editingUser,
    t("errors.noEditPermission"),
    async (data: UpdateUserRequest) => {
      const editingUser = dialogs.editingUser!;
      const editAppPermissions = dialogs.editAppPermissions;
      const isSelf = editingUser.id === permissions.currentUserId;

      // Build update payload
      const updateData: UpdateUserRequest = {};

      if (data.name !== editingUser.name) {
        updateData.name = data.name;
      }

      if (data.email !== editingUser.email) {
        updateData.email = data.email;
        updateData.emailVerified = null; // Require re-verification
      }

      // Only allow role change if not editing self
      if (!isSelf && data.roleId !== editingUser.roleId) {
        updateData.roleId = data.roleId;
      }

      if (data.password && data.password.trim() !== "") {
        updateData.password = data.password;
      }

      // Check if there are any user profile changes
      const hasUserChanges = Object.keys(updateData).length > 0;

      // Check if there are app permissions changes
      const currentAppPermissions = editingUserAppPermissions?.permissions ?? {};
      const appPermissionsChanged =
        JSON.stringify(editAppPermissions) !== JSON.stringify(currentAppPermissions);

      if (!hasUserChanges && !appPermissionsChanged) {
        toast.info(tc("form.noChanges"));
        return;
      }

      // Close dialog immediately for instant feedback
      closeEditDialog();

      // Fire mutations (optimistic update + rollback handles errors)
      if (hasUserChanges) {
        updateUserMutation.mutate({
          userId: editingUser.id,
          data: updateData,
        });
      }

      // Update app permissions if there are changes and user has permission
      if (appPermissionsChanged && permissions.canManageAppAccess) {
        updateAppPermissionsMutation.mutate({
          userId: editingUser.id,
          permissions: editAppPermissions,
        });
      }
    },
  );

  /**
   * Helper to check if an action should be disabled
   */
  const shouldDisableAction = (user: { id: string; isSystemRole: boolean }) => {
    // System users cannot be edited
    if (user.isSystemRole) {
      return true;
    }
    // Cannot perform actions on yourself
    if (user.id === permissions.currentUserId) {
      return true;
    }
    return false;
  };

  /**
   * Helper to get disabled action tooltip
   */
  const getDisabledActionTooltip = (
    user: { id: string; isSystemRole: boolean },
    action: "delete" | "deactivate" | "edit",
  ) => {
    if (user.isSystemRole) {
      return t("errors.cannotModifySystem");
    }
    if (user.id === permissions.currentUserId) {
      if (action === "delete") return t("errors.cannotDeleteSelf");
      if (action === "deactivate") return t("errors.cannotDeactivateSelf");
      return t("errors.cannotModifySystem");
    }
    return "";
  };

  return {
    // Mutation states
    mutations: {
      createUser: createUserMutation,
      createInvite: createInviteMutation,
      cancelInvite: cancelInviteMutation,
      resendInvite: resendInviteMutation,
      toggleUserStatus: toggleUserStatusMutation,
      permanentlyDeleteUser: permanentlyDeleteUserMutation,
      unlockUser: unlockUserMutation,
      updateUser: updateUserMutation,
      updateAppPermissions: updateAppPermissionsMutation,
      startImpersonation: startImpersonationMutation,
    },

    // Data
    editingUserAppPermissions,

    // Handlers
    handleCreateUser,
    handleInviteUser,
    handleCancelInvite,
    handleResendInvite,
    handleConfirmToggleUserStatus,
    handleConfirmPermanentlyDeleteUser,
    handleConfirmStartImpersonation,
    handleConfirmUnlockUser,
    handleEditUser,

    // Business logic helpers
    shouldDisableAction,
    getDisabledActionTooltip,
  };
}
