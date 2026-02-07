"use client";

import { useCallback, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ImageUploaderProps {
  /** Current image URL (existing image) */
  value?: string | null;
  /** Callback when a file is selected */
  onFileSelect?: (file: File | null) => void;
  /** Callback when the image should be removed */
  onRemove?: () => void;

  // Configuration
  /** Maximum file size in bytes (default: 5MB) */
  maxSizeBytes?: number;
  /** Accepted file types (default: "image/*") */
  accept?: string;
  /** Maximum preview size in pixels (default: 200) */
  previewSize?: number;
  /** Whether drag-and-drop is enabled (default: true) */
  enableDragDrop?: boolean;
  /** Custom help text (e.g., "PNG, JPG, GIF up to 5MB") */
  helpText?: string;

  // State
  /** Whether the component is disabled */
  disabled?: boolean;

  // Styling
  /** Additional class name for the container */
  className?: string;
  /** Shape variant for image preview */
  variant?: "square" | "circle";

  // Translations
  /** Text for file selection button (default: "Select") */
  uploadButtonText?: string;
  /** Text for Remove button (default: "Remove") */
  removeButtonText?: string;
}

export function ImageUploader({
  value,
  onFileSelect,
  onRemove,
  maxSizeBytes = 5 * 1024 * 1024,
  accept = "image/*",
  previewSize = 200,
  enableDragDrop = true,
  disabled = false,
  className,
  variant = "square",
  uploadButtonText = "Select",
  removeButtonText = "Remove",
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        return;
      }
      if (file.size > maxSizeBytes) {
        toast.error(`File size must be less than ${Math.round(maxSizeBytes / (1024 * 1024))}MB`);
        return;
      }

      // Notify parent about the selected file
      onFileSelect?.(file);
    },
    [onFileSelect, maxSizeBytes],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!enableDragDrop || disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [enableDragDrop, disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!enableDragDrop) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    },
    [enableDragDrop],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (!enableDragDrop || disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        validateAndProcessFile(file);
      }
    },
    [enableDragDrop, disabled, validateAndProcessFile],
  );

  const handleUploadClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleRemoveClick = () => {
    if (disabled || !value) return;
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onRemove?.();
  };

  const isCircle = variant === "circle";
  const hasImage = !!value;

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="sr-only"
        disabled={disabled}
      />

      {/* Main container box */}
      <div
        className={cn(
          "relative overflow-hidden transition-colors border rounded-lg",
          disabled ? "opacity-50" : "border-muted-foreground/25",
          isDragging && !disabled && "border-primary bg-primary/5",
        )}
      >
        {/* Content area */}
        <div className="flex  gap-space-lg p-card  items-center ">
          {/* Image preview area (left on desktop, top on mobile) */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "shrink-0 transition-colors",
              enableDragDrop && !disabled && "cursor-pointer",
            )}
            onClick={hasImage && !disabled ? handleUploadClick : undefined}
            style={{ maxWidth: previewSize, maxHeight: previewSize }}
          >
            {hasImage ? (
              <div className="relative">
                {/* Native img for blob URL support */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="Preview"
                  className={cn("object-cover", isCircle ? "rounded-full" : "rounded-md")}
                  style={{ width: previewSize, height: previewSize }}
                />
              </div>
            ) : (
              // Placeholder when no image
              <div
                className={cn(
                  "flex items-center justify-center bg-muted",
                  isCircle ? "rounded-full" : "rounded-lg",
                )}
                style={{ width: previewSize, height: previewSize }}
              >
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Button group (right on desktop, bottom on mobile) */}
          <div className="flex flex-col gap-space-sm">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleUploadClick}
              disabled={disabled}
              className="w-full md:w-auto"
            >
              {uploadButtonText}
            </Button>

            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleRemoveClick}
              disabled={disabled || !hasImage}
              className="w-full md:w-auto text-destructive"
            >
              {removeButtonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
