import { useEffect, useRef, useState } from "react";

export interface UseImagePreviewReturn {
  /** Blob URL for the selected file (null if none) */
  previewUrl: string | null;
  /** Update the file and create a new preview URL */
  updateFile: (file: File | null) => void;
}

/**
 * Hook to manage blob URL lifecycle for image previews.
 * Automatically cleans up URLs on unmount and when file changes.
 *
 * @example
 * ```tsx
 * const preview = useImagePreview();
 *
 * const handleFileChange = (file: File) => {
 *   preview.updateFile(file);
 *   onFileSelect(file);
 * };
 *
 * // Display: preview.previewUrl (new) || existingUrl
 * <img src={preview.previewUrl || existingUrl} />
 * ```
 */
export function useImagePreview(): UseImagePreviewReturn {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previousUrlRef = useRef<string | null>(null);

  // Clean up blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const updateFile = (file: File | null) => {
    // Revoke previous URL if exists
    if (previousUrlRef.current) {
      URL.revokeObjectURL(previousUrlRef.current);
      previousUrlRef.current = null;
    }

    if (file) {
      const newUrl = URL.createObjectURL(file);
      previousUrlRef.current = newUrl;
      setPreviewUrl(newUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  return {
    previewUrl,
    updateFile,
  };
}
