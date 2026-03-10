"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createServiceSchema } from "@/validations/service.validations";
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
import { Textarea } from "@/components/ui/textarea";

export type ServiceFormValues = z.infer<typeof createServiceSchema>;

export interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<ServiceFormValues>;
  onSubmit: (data: ServiceFormValues) => void;
  isEditing: boolean;
  isSaving: boolean;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isEditing,
  isSaving,
}: ServiceFormDialogProps) {
  const tc = useTranslations("common");
  const t = useTranslations("apps/services");

  // Extend schema with translated error messages at runtime
  const translatedFormSchema = z.object({
    code: z.string().trim().min(1, t("errors.codeRequired")).max(20, t("errors.codeMaxLength")),
    description: z
      .string()
      .trim()
      .min(1, t("errors.descriptionRequired"))
      .max(500, t("errors.descriptionMaxLength")),
    debit: z.string().trim().min(1, t("errors.debitRequired")).max(100, t("errors.debitMaxLength")),
    sn: z.object({
      issqn: z.number().min(0).max(100).nullable(),
      inss: z.number().min(0).max(100).nullable(),
      cs: z.number().min(0).max(100).nullable(),
      irrf: z.number().min(0).max(100).nullable(),
    }),
    n: z.object({
      issqn: z.number().min(0).max(100).nullable(),
      inss: z.number().min(0).max(100).nullable(),
      cs: z.number().min(0).max(100).nullable(),
      irrf: z.number().min(0).max(100).nullable(),
    }),
    mei: z.object({
      issqn: z.number().min(0).max(100).nullable(),
      inss: z.number().min(0).max(100).nullable(),
      cs: z.number().min(0).max(100).nullable(),
      irrf: z.number().min(0).max(100).nullable(),
    }),
    obs: z.string().optional(),
  });

  type TranslatedServiceFormValues = z.infer<typeof translatedFormSchema>;

  const form = useForm<TranslatedServiceFormValues>({
    resolver: zodResolver(translatedFormSchema),
    mode: "onBlur", // Validate only on blur
    defaultValues: {
      code: "",
      description: "",
      debit: "",
      sn: { issqn: null, inss: null, cs: null, irrf: null },
      n: { issqn: null, inss: null, cs: null, irrf: null },
      mei: { issqn: null, inss: null, cs: null, irrf: null },
      obs: "",
      ...initialData,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        code: "",
        description: "",
        debit: "",
        sn: { issqn: null, inss: null, cs: null, irrf: null },
        n: { issqn: null, inss: null, cs: null, irrf: null },
        mei: { issqn: null, inss: null, cs: null, irrf: null },
        obs: "",
        ...initialData,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: TranslatedServiceFormValues) => {
    // Cast to ServiceFormValues for the parent handler
    onSubmit(data as ServiceFormValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[80vh] overflow-y-auto">
          <DialogDescription className="mb-space-lg">
            {isEditing ? t("editDescription") : t("createDescription")}
          </DialogDescription>
          <Form {...form}>
            <form
              id="service-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-section"
            >
              {/* Basic Fields */}
              <div className="space-y-section">
                <h3 className="text-sm font-medium">{t("sections.basic")}</h3>
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("fields.code")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.code}
                    >
                      <Input
                        {...field}
                        placeholder={t("fields.codePlaceholder")}
                        disabled={isEditing}
                      />
                    </FormFieldWithTooltip>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("fields.description")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.description}
                    >
                      <Input {...field} placeholder={t("fields.descriptionPlaceholder")} />
                    </FormFieldWithTooltip>
                  )}
                />
                <FormField
                  control={form.control}
                  name="debit"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("fields.debit")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.debit}
                    >
                      <Input {...field} placeholder={t("fields.debitPlaceholder")} />
                    </FormFieldWithTooltip>
                  )}
                />
              </div>

              {/* Tax Rates - Simples Nacional */}
              <div className="space-y-section">
                <h3 className="text-sm font-medium">{t("sections.snTaxes")}</h3>
                <div className="grid gap-space-lg sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="sn.issqn"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.issqn")}
                        isTouched={!!form.formState.touchedFields.sn?.issqn}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sn.inss"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.inss")}
                        isTouched={!!form.formState.touchedFields.sn?.inss}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sn.cs"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.cs")}
                        isTouched={!!form.formState.touchedFields.sn?.cs}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sn.irrf"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.irrf")}
                        isTouched={!!form.formState.touchedFields.sn?.irrf}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                </div>
              </div>

              {/* Tax Rates - Normal */}
              <div className="space-y-section">
                <h3 className="text-sm font-medium">{t("sections.nTaxes")}</h3>
                <div className="grid gap-space-lg sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="n.issqn"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.issqn")}
                        isTouched={!!form.formState.touchedFields.n?.issqn}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="n.inss"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.inss")}
                        isTouched={!!form.formState.touchedFields.n?.inss}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="n.cs"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.cs")}
                        isTouched={!!form.formState.touchedFields.n?.cs}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="n.irrf"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.irrf")}
                        isTouched={!!form.formState.touchedFields.n?.irrf}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                </div>
              </div>

              {/* Tax Rates - MEI */}
              <div className="space-y-section">
                <h3 className="text-sm font-medium">{t("sections.meiTaxes")}</h3>
                <div className="grid gap-space-lg sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="mei.issqn"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.issqn")}
                        isTouched={!!form.formState.touchedFields.mei?.issqn}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mei.inss"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.inss")}
                        isTouched={!!form.formState.touchedFields.mei?.inss}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mei.cs"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.cs")}
                        isTouched={!!form.formState.touchedFields.mei?.cs}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="mei.irrf"
                    render={({ field }) => (
                      <FormFieldWithTooltip
                        label={t("fields.taxRates.irrf")}
                        isTouched={!!form.formState.touchedFields.mei?.irrf}
                      >
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          placeholder="0.00"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? null : e.target.value)
                          }
                        />
                      </FormFieldWithTooltip>
                    )}
                  />
                </div>
              </div>

              {/* Observations */}
              <FormField
                control={form.control}
                name="obs"
                render={({ field, fieldState }) => (
                  <FormFieldWithTooltip
                    label={t("fields.obs")}
                    error={fieldState.error?.message}
                    isTouched={!!form.formState.touchedFields.obs}
                  >
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder={t("fields.obsPlaceholder")}
                      rows={3}
                    />
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
            form="service-form"
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
