"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import type { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { createGameSchema, type CreateGameInput } from "@/validations/game.validations";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./star-rating";

export interface GameFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: CreateGameInput | null;
  existingCoverUrl?: string | null;
  onSubmit: (
    data: CreateGameInput,
    coverFile: File | null,
    isCoverRemoved: boolean,
  ) => Promise<void>;
  isEditing: boolean;
  isSaving: boolean;
  t: ReturnType<typeof useTranslations<"apps/games">>;
  tc: ReturnType<typeof useTranslations<"common">>;
}

export function GameFormDialog({
  open,
  onOpenChange,
  initialData,
  existingCoverUrl,
  onSubmit,
  isEditing,
  isSaving,
  t,
  tc,
}: GameFormDialogProps) {
  // Use new hooks for image management
  const imageUpload = useImageUpload();
  const preview = useImagePreview();

  const form = useForm({
    resolver: zodResolver(createGameSchema),
    defaultValues: {
      name: "",
      xboxStoreLink: null,
      rating: 0,
      multiplayerFunctional: false,
      tried: false,
      played: false,
      dropReason: null,
      notes: null,
    },
  });

  // Only reset form when dialog opens, not when initialData changes while open
  useEffect(() => {
    if (open) {
      form.reset(
        initialData || {
          name: "",
          xboxStoreLink: null,
          rating: 0,
          multiplayerFunctional: false,
          tried: false,
          played: false,
          dropReason: null,
          notes: null,
        },
      );
      imageUpload.reset();
      preview.updateFile(null);
    } else {
      // Clear preview when dialog closes
      imageUpload.reset();
      preview.updateFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Removed initialData - only depend on open state

  const handleSubmit = async (data: CreateGameInput) => {
    await onSubmit(data, imageUpload.selectedFile, imageUpload.isRemoved);
  };

  const handleCoverSelect = (file: File | null) => {
    if (file) {
      preview.updateFile(file);
      imageUpload.handleFileSelect(file);
    } else {
      imageUpload.handleFileSelect(null);
    }
  };

  const showDropReason = form.watch("tried");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("newTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <DialogDescription>
            {isEditing ? t("editDescription") : t("createDescription")}
          </DialogDescription>
          <Form {...form}>
            <form id="game-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-space-lg">
              {/* Cover Image */}
              <div className="space-y-space-sm">
                <FormLabel>{t("fields.coverImage")}</FormLabel>
                <ImageUploader
                  value={imageUpload.isRemoved ? null : preview.previewUrl || existingCoverUrl}
                  onFileSelect={handleCoverSelect}
                  onRemove={imageUpload.handleRemove}
                  disabled={isSaving}
                  previewSize={120}
                  variant="square"
                  removeButtonText={tc("buttons.remove")}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("fields.namePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="xboxStoreLink"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.xboxStoreLink")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://www.xbox.com/..."
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.rating")}</FormLabel>
                    <FormControl>
                      <div className="pt-space-xs">
                        <StarRating
                          rating={field.value || 0}
                          onChange={field.onChange}
                          readonly={isSaving}
                          size="lg"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-space-lg sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="multiplayerFunctional"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-space-md shadow-sm">
                      <FormLabel className="text-base">
                        {t("fields.multiplayerFunctional")}
                      </FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tried"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-space-md shadow-sm">
                      <FormLabel className="text-base">{t("fields.tried")}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="played"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-space-md shadow-sm">
                      <FormLabel className="text-base">{t("fields.played")}</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {showDropReason && (
                <FormField
                  control={form.control}
                  name="dropReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("fields.dropReason")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("fields.dropReasonPlaceholder")}
                          {...field}
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.notes")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("fields.notesPlaceholder")}
                        rows={4}
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="game-form"
            disabled={!form.formState.isValid || isSaving}
            loading={isSaving}
          >
            {isEditing ? t("updateButton") : t("createButton")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
