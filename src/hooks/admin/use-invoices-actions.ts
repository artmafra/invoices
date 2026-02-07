"use client";

import type { InvoiceStatus } from "@/schema/invoices.schema";
import { useTranslations } from "next-intl";
import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type { useCreateInvoice, useDeleteInvoice, useUpdateInvoice } from "./use-invoices";
import type { InvoicePermissions } from "./use-resource-permissions";

/**
 * Hook parameters for invoice actions
 */
export interface UseInvoicesActionsParams {
  permissions: InvoicePermissions & {
    currentUserId: string | undefined;
    isLoading: boolean;
  };
  createMutation: ReturnType<typeof useCreateInvoice>;
  updateMutation: ReturnType<typeof useUpdateInvoice>;
  deleteMutation: ReturnType<typeof useDeleteInvoice>;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * Hook to manage all invoice-related actions and mutations
 * Consolidates mutation handlers from the page component
 */
export function useInvoicesActions({
  permissions,
  createMutation,
  updateMutation,
  deleteMutation,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
}: UseInvoicesActionsParams) {
  const t = useTranslations("apps/invoices");

  /**
   * Create invoice handler
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
   * Update invoice handler
   * Await mutation (no optimistic update by default)
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
   * Delete invoice handler
   */
  const handleDelete = withPermissionGuard(
    permissions.canDelete,
    t("errors.noDeletePermission"),
    async (invoiceId: string) => {
      await deleteMutation.mutateAsync(invoiceId);
      onDeleteSuccess?.();
    },
  );

  /**
   * Quick status change handler
   * Example: draft → issued → paid → cancelled
   */
  const handleStatusChange = withPermissionGuard(
    permissions.canEdit,
    t("errors.noEditPermission"),
    (invoiceId: string, status: InvoiceStatus) => {
      updateMutation.mutate({
        invoiceId,
        data: { status },
      });
    },
  );

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    handleStatusChange,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
