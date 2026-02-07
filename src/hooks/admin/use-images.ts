import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiErrorFromResponseBody, handleMutationError } from "@/lib/api-request-error";

// =============================================================================
// Query Keys
// =============================================================================

export const QUERY_KEYS = {
  all: ["admin", "images"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
} as const;

// =============================================================================
// Types
// =============================================================================

interface ImageData {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

interface UploadImageData {
  file: File;
  folder?: string;
}

interface BulkUploadData {
  files: File[];
  folder?: string;
}

// Get images hook
export const useImages = () => {
  const t = useTranslations("admin.hooks.images");

  return useQuery({
    queryKey: QUERY_KEYS.all,
    queryFn: async (): Promise<ImageData[]> => {
      const response = await fetch("/api/admin/images");

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.fetchFailed"));
      }

      return result as ImageData[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Upload single image hook
export const useUploadImage = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("admin.hooks.images");

  return useMutation({
    mutationFn: async (data: UploadImageData): Promise<ImageData> => {
      const formData = new FormData();
      formData.append("image", data.file);
      if (data.folder) {
        formData.append("folder", data.folder);
      }

      const response = await fetch("/api/admin/images", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.uploadFailed"));
      }

      return result as ImageData;
    },
    onSuccess: () => {
      // Invalidate and refetch images list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("uploaded"));
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

// Bulk upload images hook
export const useBulkUploadImages = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("admin.hooks.images");

  return useMutation({
    mutationFn: async (data: BulkUploadData): Promise<ImageData[]> => {
      const formData = new FormData();

      data.files.forEach((file) => {
        formData.append("images", file);
      });

      if (data.folder) {
        formData.append("folder", data.folder);
      }

      const response = await fetch("/api/admin/images/bulk", {
        method: "POST",
        body: formData,
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.uploadFailed"));
      }

      return result as ImageData[];
    },
    onSuccess: (data) => {
      // Invalidate and refetch images list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
      toast.success(t("uploadedCount", { count: data.length }));
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

// Delete image hook
export const useDeleteImage = () => {
  const queryClient = useQueryClient();
  const t = useTranslations("admin.hooks.images");

  return useMutation({
    mutationFn: async (imageId: string) => {
      const response = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw apiErrorFromResponseBody(result, t("errors.deleteFailed"));
      }

      return result;
    },
    onMutate: async (imageId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.all });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(QUERY_KEYS.all);

      // Optimistically remove the image from cache
      queryClient.setQueryData(QUERY_KEYS.all, (old: ImageData[] | undefined) => {
        if (!old) return old;
        return old.filter((image) => image.id !== imageId);
      });

      return { previousData };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(QUERY_KEYS.all, context.previousData);
      }
      handleMutationError(error, {
        forbidden: t("errors.noPermissionDelete"),
        notFound: t("errors.notFound"),
        fallback: t("errors.deleteFailed"),
      });
    },
    onSuccess: () => {
      toast.success(t("deleted"));
    },
    onSettled: () => {
      // Always invalidate after mutation completes
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.lists() });
    },
  });
};
