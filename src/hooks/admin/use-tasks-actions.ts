"use client";

import type { TaskStatus } from "@/schema/tasks.schema";
import { useTranslations } from "next-intl";
import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type { TaskPermissions } from "./use-resource-permissions";
import type { useCreateTask, useDeleteTask, useUpdateTask } from "./use-tasks";

/**
 * Hook parameters for task actions
 */
export interface UseTasksActionsParams {
  permissions: TaskPermissions & { currentUserId: string | undefined; isLoading: boolean };
  createMutation: ReturnType<typeof useCreateTask>;
  updateMutation: ReturnType<typeof useUpdateTask>;
  deleteMutation: ReturnType<typeof useDeleteTask>;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * Hook to manage all task-related actions and mutations
 * Consolidates mutation handlers from the page component
 */
export function useTasksActions({
  permissions,
  createMutation,
  updateMutation,
  deleteMutation,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
}: UseTasksActionsParams) {
  const t = useTranslations("apps/tasks");

  /**
   * Create task handler
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
   * Update task handler
   * Uses optimistic updates - closes dialog immediately for instant feedback
   */
  const handleUpdate = withPermissionGuard(
    permissions.canEdit,
    t("errors.noEditPermission"),
    (data: Parameters<typeof updateMutation.mutateAsync>[0]) => {
      // Close dialog immediately for instant feedback
      onUpdateSuccess?.();

      // Fire mutation (optimistic update handles the rest)
      updateMutation.mutate(data);
    },
  );

  /**
   * Delete task handler
   */
  const handleDelete = withPermissionGuard(
    permissions.canDelete,
    t("errors.noDeletePermission"),
    async (taskId: string) => {
      await deleteMutation.mutateAsync(taskId);
      onDeleteSuccess?.();
    },
  );

  /**
   * Quick status change handler
   * Uses optimistic updates - fires mutation immediately
   */
  const handleStatusChange = withPermissionGuard(
    permissions.canEdit,
    t("errors.noEditPermission"),
    (taskId: string, status: TaskStatus) => {
      // Fire mutation (optimistic update changes status immediately)
      updateMutation.mutate({ taskId, data: { status } });
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
