import { useCallback, useState } from "react";

export interface UseImageUploadReturn {
  /** Currently selected file (before upload) */
  selectedFile: File | null;
  /** Whether the existing image should be removed */
  isRemoved: boolean;
  /** Whether there are unsaved changes */
  hasChanges: boolean;
  /** Handle file selection from input */
  handleFileSelect: (file: File | null) => void;
  /** Mark existing image for removal */
  handleRemove: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Get the display value for the uploader (handles removal flag) */
  getDisplayValue: (currentValue: string | null | undefined) => string | null;
}

/**
 * Hook to manage image upload state (file selection + removal tracking).
 * Standardizes the pattern used across avatar upload, game forms, etc.
 *
 * @example
 * ```tsx
 * const imageUpload = useImageUpload();
 *
 * <ImageUploader
 *   value={imageUpload.getDisplayValue(existingUrl)}
 *   onFileSelect={imageUpload.handleFileSelect}
 *   onRemove={imageUpload.handleRemove}
 * />
 *
 * // On save:
 * if (imageUpload.hasChanges) {
 *   if (imageUpload.isRemoved) {
 *     await deleteImage();
 *   } else if (imageUpload.selectedFile) {
 *     await uploadImage(imageUpload.selectedFile);
 *   }
 * }
 * ```
 */
export function useImageUpload(): UseImageUploadReturn {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRemoved, setIsRemoved] = useState(false);

  const handleFileSelect = useCallback((file: File | null) => {
    setSelectedFile(file);
    // If a file is selected, we're not removing
    if (file) {
      setIsRemoved(false);
    }
  }, []);

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setIsRemoved(true);
  }, []);

  const reset = useCallback(() => {
    setSelectedFile(null);
    setIsRemoved(false);
  }, []);

  const getDisplayValue = useCallback(
    (currentValue: string | null | undefined): string | null => {
      // If marked for removal, show nothing
      if (isRemoved) {
        return null;
      }
      // Otherwise show the current value
      return currentValue || null;
    },
    [isRemoved],
  );

  // Has changes if: file selected OR existing image marked for removal
  const hasChanges = selectedFile !== null || isRemoved;

  return {
    selectedFile,
    isRemoved,
    hasChanges,
    handleFileSelect,
    handleRemove,
    reset,
    getDisplayValue,
  };
}
