import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type {
  CreateRoleRequest,
  RoleResponse,
  UpdateRoleRequest,
} from "@/types/common/roles.types";
import type { PermissionGroup } from "@/types/permissions/permission-api.types";
import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import { getPermissionString } from "@/hooks/admin/use-permissions";
import type { RolePermissionsWithContext } from "@/hooks/admin/use-resource-permissions";
import { useCreateRole, useDeleteRole, useUpdateRole } from "@/hooks/admin/use-roles";
import type { RolesDialogState } from "./use-roles-dialogs";

export interface UseRolesActionsParams {
  permissions: RolePermissionsWithContext;
  dialogs: RolesDialogState;
  permissionGroups: PermissionGroup[] | undefined;
  closeCreateDialog: () => void;
  closeEditDialog: () => void;
  closeDeleteConfirm: () => void;
}

/**
 * Custom hook for managing roles actions and mutations
 * Handles create, update, delete operations and permission helpers
 *
 * @param params - Permissions, dialog states, permission groups, and close handlers
 * @returns Mutation objects and handler functions
 */
export function useRolesActions({
  permissions,
  dialogs,
  permissionGroups,
  closeCreateDialog,
  closeEditDialog,
  closeDeleteConfirm,
}: UseRolesActionsParams) {
  const t = useTranslations("system.roles");

  // Mutations
  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  // Get all permissions as flat array
  const allPermissions = permissionGroups?.flatMap((group) => group.permissions) || [];

  // Helper to get permission IDs from permission strings
  const getPermissionIdsFromStrings = (permStrings: string[]): string[] => {
    return allPermissions
      .filter((p) => permStrings.includes(getPermissionString(p)))
      .map((p) => p.id);
  };

  // Helper to get permission strings from permission IDs
  const getPermissionStringsFromIds = (permIds: string[]): string[] => {
    return allPermissions.filter((p) => permIds.includes(p.id)).map((p) => getPermissionString(p));
  };

  // Create role handler
  const handleCreateRole = withPermissionGuard(
    permissions.canCreate,
    t("errors.noCreatePermission"),
    async (data: CreateRoleRequest) => {
      await createRoleMutation.mutateAsync(data);
      closeCreateDialog();
    },
  );

  // Edit role handler
  const handleEditRole = withPermissionGuard(
    permissions.canEdit && !!dialogs.editingRole,
    t("errors.noEditPermission"),
    async (data: UpdateRoleRequest) => {
      const editingRole = dialogs.editingRole!; // Safe: checked in permission guard

      // Check for self-demotion
      if (editingRole.id === permissions.currentUserRoleId) {
        const currentPermissionStrings = permissions.currentUserPermissions;
        const currentHasRolesEdit = currentPermissionStrings.includes("roles.edit");
        const newPermStrings = getPermissionStringsFromIds(data.permissionIds || []);
        const newHasRolesEdit = newPermStrings.includes("roles.edit");

        if (currentHasRolesEdit && !newHasRolesEdit) {
          toast.error(t("errors.cannotRemoveOwnPermissions"));
          return;
        }
      }

      // Build update payload
      const updateData: UpdateRoleRequest = {};

      if (data.displayName !== editingRole.displayName) {
        updateData.displayName = data.displayName;
      }

      if (data.description !== editingRole.description) {
        updateData.description = data.description;
      }

      // Always include permissions if they might have changed
      const currentPermIds = getPermissionIdsFromStrings(editingRole.permissions);
      const newPermIds = data.permissionIds || [];
      const permsChanged =
        currentPermIds.length !== newPermIds.length ||
        !currentPermIds.every((id) => newPermIds.includes(id));

      if (permsChanged) {
        updateData.permissionIds = newPermIds;
      }

      // Check if there are any changes
      if (Object.keys(updateData).length === 0) {
        toast.info(t("errors.noChanges"));
        return;
      }

      // Close dialog immediately for instant feedback
      closeEditDialog();

      // Fire mutation (optimistic update handles the rest)
      updateRoleMutation.mutate({
        roleId: editingRole.id,
        data: updateData,
      });
    },
  );

  // Delete role handler
  const handleConfirmDeleteRole = async () => {
    if (!dialogs.roleToDelete) return;

    try {
      await deleteRoleMutation.mutateAsync(dialogs.roleToDelete.id);
      closeDeleteConfirm();
    } catch {
      // Error is already handled by the hook
    }
  };

  // Helper to check if an action should be disabled
  const shouldDisableAction = (role: RoleResponse, action: "delete" | "edit") => {
    if (action === "delete") {
      if (role.isProtected) return true;
      if (role.id === permissions.currentUserRoleId) return true;
      if (role.userCount > 0) return true;
    }
    return false;
  };

  // Helper to get tooltip for disabled actions
  const getDisabledActionTooltip = (role: RoleResponse, action: "delete" | "edit") => {
    if (action === "delete") {
      if (role.isProtected) return t("tooltips.cannotDeleteProtected");
      if (role.id === permissions.currentUserRoleId) return t("tooltips.cannotDeleteOwn");
      if (role.userCount > 0) return t("tooltips.hasUsers", { count: role.userCount });
    }
    return "";
  };

  return {
    // Mutations
    mutations: {
      createRole: createRoleMutation,
      updateRole: updateRoleMutation,
      deleteRole: deleteRoleMutation,
    },
    // Permission helpers
    getPermissionIdsFromStrings,
    getPermissionStringsFromIds,
    // Action handlers
    handleCreateRole,
    handleEditRole,
    handleConfirmDeleteRole,
    // UI helpers
    shouldDisableAction,
    getDisabledActionTooltip,
  };
}
