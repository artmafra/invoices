"use client";

import { useTranslations } from "next-intl";
import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type { SupplierPermissions } from "./use-resource-permissions";
import type { useCreateSupplier, useDeleteSupplier, useUpdateSupplier } from "./use-suppliers";

/**
 * Hook parameters for supplier actions
 */
export interface UseSuppliersActionsParams {
  permissions: SupplierPermissions & { currentUserId: string | undefined; isLoading: boolean };
  createMutation: ReturnType<typeof useCreateSupplier>;
  updateMutation: ReturnType<typeof useUpdateSupplier>;
  deleteMutation: ReturnType<typeof useDeleteSupplier>;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * Hook to manage all supplier-related actions and mutations
 * Consolidates mutation handlers from the page component
 */
export function useSuppliersActions({
  permissions,
  createMutation,
  updateMutation,
  deleteMutation,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
}: UseSuppliersActionsParams) {
  const t = useTranslations("apps/suppliers");

  /**
   * Create supplier handler
   */
  const handleCreate = withPermissionGuard(
    permissions.canCreate,
    t("errors.noCreatePermission"),
    async (data: Parameters<typeof createMutation.mutateAsync>[0]) => {
      await createMutation.mutateAsync(data);
      onCreateSuccess?.();
    },
  );

  /**
   * Update supplier handler
   */
  const handleUpdate = withPermissionGuard(
    permissions.canEdit,
    t("errors.noEditPermission"),
    async (data: Parameters<typeof updateMutation.mutateAsync>[0]) => {
      await updateMutation.mutateAsync(data);
      onUpdateSuccess?.();
    },
  );

  /**
   * Delete supplier handler
   */
  const handleDelete = withPermissionGuard(
    permissions.canDelete,
    t("errors.noDeletePermission"),
    async (id: number) => {
      await deleteMutation.mutateAsync(id);
      onDeleteSuccess?.();
    },
  );

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
