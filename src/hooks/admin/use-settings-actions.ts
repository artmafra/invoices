"use client";

import { withPermissionGuard } from "@/lib/mutations/permission-guard";
import type {
  CreateSettingRequest,
  UpdateSettingRequest,
  UploadImageRequest,
} from "@/validations/settings.validations";
import type {
  useCreateSetting,
  useUpdateSetting,
  useUploadSettingImage,
} from "./use-admin-settings";
import type { SettingsPermissions } from "./use-resource-permissions";

export interface UseSettingsActionsParams {
  permissions: SettingsPermissions & { currentUserId: string | undefined; isLoading: boolean };
  createMutation: ReturnType<typeof useCreateSetting>;
  updateMutation: ReturnType<typeof useUpdateSetting>;
  uploadImageMutation: ReturnType<typeof useUploadSettingImage>;
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onUploadSuccess?: () => void;
}

/**
 * Hook to manage all settings-related actions and mutations
 */
export function useSettingsActions({
  permissions,
  createMutation,
  updateMutation,
  uploadImageMutation,
  onCreateSuccess,
  onUpdateSuccess,
  onUploadSuccess,
}: UseSettingsActionsParams) {
  /**
   * Create setting handler
   * Note: Settings use canEdit for both create and edit operations
   */
  const handleCreate = withPermissionGuard(
    permissions.canEdit,
    "No permission to create settings", // This will be replaced by page-level translation
    async (data: CreateSettingRequest) => {
      await createMutation.mutateAsync(data);
      onCreateSuccess?.();
    },
  );

  /**
   * Update setting handler
   */
  const handleUpdate = withPermissionGuard(
    permissions.canEdit,
    "No permission to update settings", // This will be replaced by page-level translation
    async (data: UpdateSettingRequest) => {
      await updateMutation.mutateAsync(data);
      onUpdateSuccess?.();
    },
  );

  /**
   * Upload image handler
   */
  const handleUploadImage = withPermissionGuard(
    permissions.canEdit,
    "No permission to upload images", // This will be replaced by page-level translation
    async (data: UploadImageRequest) => {
      const result = await uploadImageMutation.mutateAsync(data);
      onUploadSuccess?.();
      return result;
    },
  );

  return {
    handleCreate,
    handleUpdate,
    handleUploadImage,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isUploadingImage: uploadImageMutation.isPending,
  };
}
