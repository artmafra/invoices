"use client";

import { useEffect, useState } from "react";
import { useSessionContext } from "@/contexts/session-context";
import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDeleteAvatar, useUploadAvatar } from "@/hooks/public/use-profile";
import { useImagePreview } from "@/hooks/shared/use-image-preview";
import { useImageUpload } from "@/hooks/shared/use-image-upload";
import { ImageUploader } from "@/components/shared/image-uploader";
import { LoadingButton } from "@/components/shared/loading-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface AvatarUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage: string | null;
}

export function AvatarUploadModal({ isOpen, onClose, currentImage }: AvatarUploadModalProps) {
  const { update } = useSessionContext();
  const t = useTranslations("profile.avatarUpload");
  const tc = useTranslations("common.buttons");
  const uploadAvatarMutation = useUploadAvatar();
  const deleteAvatarMutation = useDeleteAvatar();

  // Use new hooks for state management
  const imageUpload = useImageUpload();
  const preview = useImagePreview();
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      imageUpload.reset();
      preview.updateFile(null);
    }
  }, [isOpen, imageUpload, preview]);

  const handleClose = () => {
    imageUpload.reset();
    preview.updateFile(null);
    setIsUploading(false);
    setIsRemoving(false);
    onClose();
  };

  const handleFileSelect = (file: File | null) => {
    if (file) {
      preview.updateFile(file);
      imageUpload.handleFileSelect(file);
    } else {
      imageUpload.handleFileSelect(null);
    }
  };

  const handleSave = async () => {
    if (imageUpload.isRemoved && currentImage) {
      // Remove image
      setIsRemoving(true);

      try {
        await deleteAvatarMutation.mutateAsync();
        await update({ image: null });
        // Toast is handled by the mutation's onSuccess callback
        handleClose();
      } catch {
        // Error toast is handled by the mutation's onError callback
        setIsRemoving(false);
      }
    } else if (imageUpload.selectedFile) {
      // Upload new image
      setIsUploading(true);

      try {
        const result = await uploadAvatarMutation.mutateAsync({ file: imageUpload.selectedFile });

        // Update session with actual URL
        await update({ image: result.imageUrl });

        toast.success(t("success"));
        handleClose();
      } catch {
        setIsUploading(false);
        // Error toast is handled by the mutation's onError callback
      }
    }
  };

  const isLoading = isUploading || isRemoving;
  const loadingText = isRemoving ? t("removing") : t("saving");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-space-sm">
            <Camera className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        <DialogBody>
          <DialogDescription>{t("description")}</DialogDescription>

          <ImageUploader
            value={imageUpload.getDisplayValue(preview.previewUrl || currentImage)}
            onFileSelect={handleFileSelect}
            onRemove={imageUpload.handleRemove}
            maxSizeBytes={10 * 1024 * 1024}
            previewSize={150}
            variant="circle"
            disabled={isLoading}
            uploadButtonText={t("clickToUpload")}
            removeButtonText={tc("remove")}
          />
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            {tc("cancel")}
          </Button>
          <LoadingButton
            type="button"
            onClick={handleSave}
            loading={isLoading}
            loadingText={loadingText}
            disabled={!imageUpload.hasChanges}
          >
            {tc("saveChanges")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
