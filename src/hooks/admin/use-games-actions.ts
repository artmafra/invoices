"use client";

import { useTranslations } from "next-intl";
import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type {
  useCreateGame,
  useDeleteGame,
  useRemoveGameCover,
  useUpdateGame,
  useUploadGameCover,
} from "./use-games";
import type { GamePermissions } from "./use-resource-permissions";

/**
 * Hook parameters for game actions
 */
export interface UseGamesActionsParams {
  permissions: GamePermissions & { currentUserId: string | undefined; isLoading: boolean };
  createMutation: ReturnType<typeof useCreateGame>;
  updateMutation: ReturnType<typeof useUpdateGame>;
  deleteMutation: ReturnType<typeof useDeleteGame>;
  uploadCoverMutation: ReturnType<typeof useUploadGameCover>;
  removeCoverMutation: ReturnType<typeof useRemoveGameCover>;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * Hook to manage all game-related actions and mutations
 * Consolidates mutation handlers from the page component
 */
export function useGamesActions({
  permissions,
  createMutation,
  updateMutation,
  deleteMutation,
  uploadCoverMutation,
  removeCoverMutation,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
}: UseGamesActionsParams) {
  const t = useTranslations("apps/games");

  /**
   * Create game handler
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
   * Update game handler
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
   * Delete game handler
   */
  const handleDelete = withPermissionGuard(
    permissions.canDelete,
    t("errors.noDeletePermission"),
    async (gameId: string) => {
      await deleteMutation.mutateAsync(gameId);
      onDeleteSuccess?.();
    },
  );

  /**
   * Upload cover image handler
   */
  const handleUploadCover = withPermissionGuard(
    permissions.canEdit,
    t("errors.noEditPermission"),
    async (gameId: string, file: File) => {
      await uploadCoverMutation.mutateAsync({ gameId, file });
    },
  );

  /**
   * Remove cover image handler
   */
  const handleRemoveCover = withPermissionGuard(
    permissions.canEdit,
    t("errors.noEditPermission"),
    async (gameId: string) => {
      await removeCoverMutation.mutateAsync(gameId);
    },
  );

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    handleUploadCover,
    handleRemoveCover,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUploadingCover: uploadCoverMutation.isPending,
    isRemovingCover: removeCoverMutation.isPending,
  };
}
