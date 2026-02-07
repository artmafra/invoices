import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";
import {
  CreateSettingRequest,
  createSettingSchema,
  Setting,
  UpdateSettingRequest,
  updateSettingSchema,
  UploadImageRequest,
  uploadImageSchema,
} from "@/validations/settings.validations";
import { SETTINGS_QUERY_KEYS as QUERY_KEYS } from "@/hooks/admin/settings.query-keys";
import { SETTINGS_QUERY_KEY } from "@/components/settings-provider";

// =============================================================================
// Types
// =============================================================================

export type AdminSetting = Setting;

export interface AdminSettingUpdate {
  key: string;
  value: string;
}

export interface AdminSettingsFilters {
  category?: string;
  search?: string;
}

// Get admin settings hook
export const useAdminSettings = (filters: AdminSettingsFilters = {}) => {
  const t = useTranslations("system.hooks.settings");

  return useQuery({
    queryKey: [...QUERY_KEYS.all, filters] as const,
    queryFn: async (): Promise<AdminSetting[]> => {
      const params = new URLSearchParams();
      if (filters?.category) params.append("category", filters.category);
      if (filters?.search) params.append("search", filters.search);

      const url = `/api/admin/settings${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as AdminSetting[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes - settings rarely change
  });
};

// Get settings categories hook
export const useSettingsCategories = () => {
  const t = useTranslations("system.hooks.settings");

  return useQuery({
    queryKey: QUERY_KEYS.categories(),
    queryFn: async (): Promise<string[]> => {
      const response = await fetch("/api/admin/settings/categories");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as string[];
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - categories rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Create new setting hook
export const useCreateSetting = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.settings");

  return useMutation({
    mutationFn: async (data: CreateSettingRequest) => {
      // Validate data before sending
      const validatedData = createSettingSchema.parse(data);

      const formData = new FormData();
      formData.append("key", validatedData.key);
      formData.append("label", validatedData.label);
      formData.append("type", validatedData.type);
      formData.append("description", validatedData.description || "");
      formData.append("category", validatedData.category);
      formData.append("scope", validatedData.scope);
      formData.append("value", validatedData.value);

      const response = await fetch("/api/admin/settings", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.createFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate settings queries to refresh the data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      toast.success(t("created"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionCreate"),
        fallback: t("errors.createFailed"),
      });
    },
  });
};

// Update single setting hook (for form-based updates)
export const useUpdateSetting = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.settings");

  return useMutation({
    mutationFn: async (data: UpdateSettingRequest) => {
      // Validate data before sending
      const validatedData = updateSettingSchema.parse(data);

      const formData = new FormData();
      formData.append("key", validatedData.key);
      formData.append("label", validatedData.label);
      formData.append("type", validatedData.type);
      formData.append("description", validatedData.description || "");
      formData.append("category", validatedData.category);
      formData.append("scope", validatedData.scope);
      formData.append("value", validatedData.value);

      const response = await fetch("/api/admin/settings", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.updateFailed"));
      }

      return result;
    },
    onMutate: async (data) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.all });
      await queryClient.cancelQueries({ queryKey: SETTINGS_QUERY_KEY });

      // Snapshot the previous values
      const previousSettings = queryClient.getQueryData(QUERY_KEYS.all);
      const previousPublicSettings = queryClient.getQueryData(SETTINGS_QUERY_KEY);

      // Optimistically update the cache
      const updates = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData(QUERY_KEYS.all, (old: AdminSetting[] | undefined) => {
        if (!old) return old;
        return old.map((setting) =>
          setting.key === data.key ? { ...setting, ...updates } : setting,
        );
      });

      return { previousSettings, previousPublicSettings };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(QUERY_KEYS.all, context.previousSettings);
      }
      if (context?.previousPublicSettings) {
        queryClient.setQueryData(SETTINGS_QUERY_KEY, context.previousPublicSettings);
      }
      handleMutationError(error, {
        forbidden: t("errors.noPermissionUpdate"),
        fallback: t("errors.updateFailed"),
      });
    },
    onSuccess: () => {
      toast.success(t("updated"));
    },
    onSettled: () => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });
};

// Upload image for setting hook
export const useUploadSettingImage = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("system.hooks.settings");

  return useMutation({
    mutationFn: async ({ file, settingId, settingKey }: UploadImageRequest) => {
      // Validate data before sending
      const validatedData = uploadImageSchema.parse({ file, settingId, settingKey });

      const formData = new FormData();
      formData.append("file", validatedData.file);
      formData.append("settingId", validatedData.settingId);
      formData.append("settingKey", validatedData.settingKey);

      const response = await fetch("/api/admin/settings/upload-image", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.uploadFailed"));
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate settings queries to refresh the data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
      toast.success(t("imageUploaded"));
    },
    onError: (error: Error) => {
      handleMutationError(error, {
        forbidden: t("errors.noPermissionUpload"),
        svgNotAllowed: t("errors.svgNotAllowed"),
        imageTooLarge: t("errors.imageTooLarge"),
        invalidImage: t("errors.invalidImage"),
        notAnImage: t("errors.notAnImage"),
        unsupportedImageFormat: t("errors.unsupportedFormat"),
        fallback: t("errors.uploadFailed"),
      });
    },
  });
};
