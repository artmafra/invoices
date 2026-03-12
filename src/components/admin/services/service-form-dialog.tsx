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

// Formata número para string com vírgula (ex: 5.5 -> "5,50")
const formatTaxRateForDisplay = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  // Converte para centavos e formata
  const cents = Math.round(value * 100);
  const integerPart = Math.floor(cents / 100);
  const decimalPart = cents % 100;
  return `${integerPart},${decimalPart.toString().padStart(2, "0")}`;
};

// Parse string formatada para número (ex: "5,50" -> 5.5)
const parseFormattedTaxRate = (formatted: string): number | null => {
  if (!formatted) return null;
  const cleaned = formatted.replace(",", "");
  const cents = parseInt(cleaned, 10);
  if (isNaN(cents)) return null;
  const value = cents / 100;
  return value > 100 ? 100 : value;
};

// Gerencia o input com máscara de empurrar dígitos
const handleTaxRateInput = (
  currentFormatted: string,
  newInput: string,
  field: { onChange: (value: number | null) => void },
) => {
  // Remove tudo exceto números
  const digitsOnly = newInput.replace(/[^0-9]/g, "");

  // Se está vazio, retorna null
  if (digitsOnly === "") {
    field.onChange(null);
    return "";
  }

  // Limita a 4 dígitos (máximo 99,99)
  const limited = digitsOnly.slice(0, 4);

  // Formata sempre com 2 casas decimais
  const cents = parseInt(limited, 10);
  if (isNaN(cents)) {
    field.onChange(null);
    return "";
  }

  // Converte para número decimal
  const value = cents / 100;

  // Limita a 100
  if (value > 100) {
    field.onChange(100);
    return "100,00";
  }

  // Atualiza o valor
  field.onChange(value);

  // Retorna formatado
  const integerPart = Math.floor(cents / 100);
  const decimalPart = cents % 100;
  return `${integerPart},${decimalPart.toString().padStart(2, "0")}`;
};

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
                      <Input {...field} placeholder={t("fields.codePlaceholder")} />
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
                          type="text"
                          placeholder="0,00"
                          value={formatTaxRateForDisplay(field.value)}
                          onChange={(e) =>
                            handleTaxRateInput(
                              formatTaxRateForDisplay(field.value),
                              e.target.value,
                              field,
                            )
                          }
                          onBlur={field.onBlur}
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
