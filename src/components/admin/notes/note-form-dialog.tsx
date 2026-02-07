"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { createNoteSchema, type CreateNoteInput } from "@/validations/note.validations";
import { TagsInput } from "@/components/admin/notes";
import { ColorPicker } from "@/components/shared/color-picker";
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

export const NOTE_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: CreateNoteInput | null;
  onSubmit: (data: CreateNoteInput) => Promise<void>;
  isEditing: boolean;
  isSaving: boolean;
}

export function NoteFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isEditing,
  isSaving,
}: NoteFormDialogProps) {
  const t = useTranslations("apps/notes");
  const tc = useTranslations("common");

  const form = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      title: "",
      content: "",
      isPinned: false,
      color: undefined,
      tags: [],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initialData || {
          title: "",
          content: "",
          isPinned: false,
          color: undefined,
          tags: [],
        },
      );
    }
  }, [open, initialData, form]);

  const handleSubmit = async (data: CreateNoteInput) => {
    await onSubmit(data);
  };

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
            <form id="note-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-space-lg">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.title")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("fields.titlePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.content")}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t("fields.contentPlaceholder")} rows={8} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <TagsInput value={field.value || []} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPinned"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-space-md shadow-sm">
                    <FormLabel className="text-base">{t("fields.pinned")}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.color")}</FormLabel>
                    <FormControl>
                      <ColorPicker
                        value={field.value || null}
                        onChange={(color) => field.onChange(color || undefined)}
                        colors={NOTE_COLORS}
                        disabled={isSaving}
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
            form="note-form"
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
