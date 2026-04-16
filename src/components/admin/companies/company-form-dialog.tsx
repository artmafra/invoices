"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { extractCnpjDigits, formatCnpj } from "@/lib/cnpj-service-code";
import { createCompanySchema } from "@/validations/company.validations";
import { FormFieldWithTooltip } from "@/components/shared/form-field-with-tooltip";
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
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CompanyFormValues = z.infer<typeof createCompanySchema>;

export interface CompanyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: Partial<CompanyFormValues>;
  onSubmit: (data: CompanyFormValues) => void;
  isEditing: boolean;
  isSaving: boolean;
}

export function CompanyFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isEditing,
  isSaving,
}: CompanyFormDialogProps) {
  const tc = useTranslations("common");
  const t = useTranslations("apps/companies");

  const translatedFormSchema = z.object({
    cnpj: z
      .string()
      .trim()
      .min(1, t("errors.cnpjRequired"))
      .regex(/^\d{14}$/, t("errors.cnpjInvalid")),
    name: z.string().trim().min(1, t("errors.nameRequired")).max(200, t("errors.nameMaxLength")),
    city: z.string().trim().min(1, t("errors.cityRequired")).max(100, t("errors.cityMaxLength")),
  });

  type TranslatedCompanyFormValues = z.infer<typeof translatedFormSchema>;

  const form = useForm<TranslatedCompanyFormValues>({
    resolver: zodResolver(translatedFormSchema),
    mode: "onBlur",
    defaultValues: {
      cnpj: "",
      name: "",
      city: "",
      ...initialData,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        cnpj: "",
        name: "",
        city: "",
        ...initialData,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: TranslatedCompanyFormValues) => {
    onSubmit(data as CompanyFormValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[80vh] overflow-y-auto">
          <DialogDescription className="mb-space-lg">
            {isEditing ? t("editDescription") : t("createDescription")}
          </DialogDescription>
          <Form {...form}>
            <form
              id="supplier-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-section"
            >
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field, fieldState }) => (
                  <FormFieldWithTooltip
                    label={t("fields.cnpj")}
                    error={fieldState.error?.message}
                    isTouched={!!form.formState.touchedFields.cnpj}
                  >
                    <Input
                      {...field}
                      placeholder={t("fields.cnpjPlaceholder")}
                      maxLength={18} // XX.XXX.XXX/XXXX-XX
                      onChange={(e) => {
                        const input = e.target.value;
                        const digits = extractCnpjDigits(input);
                        // Update with extracted digits (max 14)
                        field.onChange(digits.slice(0, 14));
                      }}
                      onBlur={() => {
                        // Ensure value is clean (digits only) on blur
                        if (field.value) {
                          field.onChange(extractCnpjDigits(field.value));
                        }
                        field.onBlur();
                      }}
                      value={field.value ? formatCnpj(field.value) : ""}
                    />
                  </FormFieldWithTooltip>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormFieldWithTooltip
                    label={t("fields.name")}
                    error={fieldState.error?.message}
                    isTouched={!!form.formState.touchedFields.name}
                  >
                    <Input {...field} placeholder={t("fields.namePlaceholder")} />
                  </FormFieldWithTooltip>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field, fieldState }) => (
                  <FormFieldWithTooltip
                    label={t("fields.city")}
                    error={fieldState.error?.message}
                    isTouched={!!form.formState.touchedFields.city}
                  >
                    <Input {...field} placeholder={t("fields.cityPlaceholder")} />
                  </FormFieldWithTooltip>
                )}
              />
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="supplier-form"
            loading={isSaving}
            loadingText={isEditing ? tc("buttons.saving") : tc("buttons.creating")}
          >
            {isEditing ? tc("buttons.save") : tc("buttons.create")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
