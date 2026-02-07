"use client";

import { useTranslations } from "next-intl";
import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type {
  useArchiveNote,
  useCreateNote,
  useDeleteNote,
  useToggleNotePin,
  useUpdateNote,
} from "./use-notes";
import type { NotePermissions } from "./use-resource-permissions";

/**
 * Hook parameters for note actions
 */
export interface UseNotesActionsParams {
  permissions: NotePermissions & { currentUserId: string | undefined; isLoading: boolean };
  createMutation: ReturnType<typeof useCreateNote>;
  updateMutation: ReturnType<typeof useUpdateNote>;
  deleteMutation: ReturnType<typeof useDeleteNote>;
  togglePinMutation: ReturnType<typeof useToggleNotePin>;
  archiveMutation: ReturnType<typeof useArchiveNote>;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * Hook to manage all note-related actions and mutations
 * Consolidates mutation handlers from the page component
 */
export function useNotesActions({
  permissions,
  createMutation,
  updateMutation,
  deleteMutation,
  togglePinMutation,
  archiveMutation,
  onCreateSuccess,
  onUpdateSuccess,
  onDeleteSuccess,
}: UseNotesActionsParams) {
  const t = useTranslations("apps/notes");

  /**
   * Create note handler
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
   * Update note handler
   * Note: Updates don't have optimistic updates, so we still await
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
   * Delete note handler
   */
  const handleDelete = withPermissionGuard(
    permissions.canDelete,
    t("errors.noDeletePermission"),
    async (noteId: string) => {
      await deleteMutation.mutateAsync(noteId);
      onDeleteSuccess?.();
    },
  );

  /**
   * Toggle pin handler
   * Uses optimistic updates - fires mutation immediately
   */
  const handleTogglePin = withPermissionGuard(
    permissions.canEdit,
    t("errors.noEditPermission"),
    (noteId: string) => {
      // Fire mutation (optimistic update toggles pin immediately)
      togglePinMutation.mutate(noteId);
    },
  );

  /**
   * Archive/unarchive handler
   * Uses optimistic updates - fires mutation immediately
   */
  const handleArchive = withPermissionGuard(
    permissions.canEdit,
    t("errors.noEditPermission"),
    (noteId: string) => {
      // Fire mutation (optimistic update toggles archive immediately)
      archiveMutation.mutate(noteId);
    },
  );

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    handleTogglePin,
    handleArchive,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isTogglingPin: togglePinMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
}
