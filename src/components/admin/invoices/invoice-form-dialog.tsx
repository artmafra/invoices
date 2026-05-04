"use client";

import { useEffect } from "react";
import type { InvoiceStatus } from "@/schema/invoices.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { extractCnpjDigits } from "@/lib/cnpj-service-code";
import { getDisplayValue, parseTocents } from "@/lib/currency-formatting";
import { cn } from "@/lib/utils";
import { createInvoiceSchema } from "@/validations/invoice.validations";
import { useDateFormat } from "@/hooks/use-date-format";
import { CnpjSelect } from "@/components/shared/cnpj-select";
import { FormFieldWithTooltip } from "@/components/shared/form-field-with-tooltip";
import { LazyCalendar } from "@/components/shared/lazy-calendar";
import { LoadingButton } from "@/components/shared/loading-button";
import { ServiceSelect } from "@/components/shared/service-select";
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
import { Form, FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_VALUES: InvoiceStatus[] = ["issued", "paid", "cancelled"];

export type InvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export interface InvoiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<InvoiceFormValues>;
  onSubmit: (data: InvoiceFormValues) => void;
  isEditing: boolean;
  isSaving: boolean;
}

export function InvoiceFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isEditing,
  isSaving,
}: InvoiceFormDialogProps) {
  const tc = useTranslations("common");
  const t = useTranslations("apps/invoices");
  const { formatDate } = useDateFormat();

  // Create translated schema with error messages
  const translatedFormSchema = z
    .object({
      status: z.enum(["issued", "paid", "cancelled"]).optional(),
      supplierCnpj: z
        .string()
        .trim()
        .min(1, t("errors.cnpjRequired"))
        .regex(/^\d{14}$/, t("errors.cnpjInvalid")),
      serviceCode: z.string().min(1, t("errors.serviceCodeRequired")),
      issueDate: z.date(),
      dueDate: z.date().optional(),
      entryDate: z.date(),
      valueCents: z
        .number()
        .int()
        .positive(t("errors.valueCentsInvalid"))
        .min(1, t("errors.valueCentsRequired"))
        .max(1_000_000_000, t("errors.valueCentsTooHigh")),
      invoiceNumber: z
        .string()
        .min(1, t("errors.invoiceNumberRequired"))
        .max(50, t("errors.invoiceNumberTooLong")),
      materialDeductionCents: z.number().int().min(0).optional(),
      inssPercent: z.number().min(0).max(100).nullable().optional(),
      csPercent: z.number().min(0).max(100).nullable().optional(),
      issqnPercent: z.number().min(0).max(100).nullable().optional(),
      irrfPercent: z.number().min(0).max(100).nullable().optional(),
    })
    .refine((data) => !data.dueDate || !data.issueDate || data.dueDate > data.issueDate, {
      message: t("errors.dueDateAfterIssueDate"),
      path: ["dueDate"],
    })
    .transform((data) => ({
      ...data,
      supplierCnpj: extractCnpjDigits(data.supplierCnpj),
    }));

  type TranslatedInvoiceFormValues = z.infer<typeof translatedFormSchema>;

  const form = useForm<TranslatedInvoiceFormValues>({
    resolver: zodResolver(translatedFormSchema),
    mode: "onBlur", // Validate only on blur
    defaultValues: {
      supplierCnpj: "",
      serviceCode: "",
      issueDate: new Date(),
      dueDate: undefined,
      entryDate: new Date(),
      valueCents: 0,
      invoiceNumber: "",
      status: "issued",
      materialDeductionCents: 0,
      inssPercent: undefined,
      csPercent: undefined,
      issqnPercent: undefined,
      irrfPercent: undefined,
      ...initialData,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        supplierCnpj: "",
        serviceCode: "",
        issueDate: new Date(),
        dueDate: undefined,
        entryDate: new Date(),
        valueCents: 0,
        invoiceNumber: "",
        status: "issued",
        materialDeductionCents: 0,
        inssPercent: undefined,
        csPercent: undefined,
        issqnPercent: undefined,
        irrfPercent: undefined,
        ...initialData,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: TranslatedInvoiceFormValues) => {
    // Cast to InvoiceFormValues for the parent handler
    onSubmit(data as InvoiceFormValues);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("newTitle")}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[80vh] overflow-y-auto">
          <DialogDescription className="mb-space-lg">
            {isEditing ? t("editDescription") : t("createDescription")}
          </DialogDescription>
          <Form {...form}>
            <form
              id="invoice-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-section"
            >
              <FormField
                control={form.control}
                name="supplierCnpj"
                render={({ field, fieldState }) => (
                  <div className="space-y-space-sm">
                    <CnpjSelect
                      value={field.value || null}
                      onChange={(cnpj) => {
                        field.onChange(cnpj || "");
                      }}
                      onBlur={field.onBlur}
                      label={t("fields.supplierCnpj")}
                      placeholder={t("fields.supplierCnpjPlaceholder")}
                    />
                    {fieldState.error?.message && form.formState.touchedFields.supplierCnpj && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
              <FormField
                control={form.control}
                name="serviceCode"
                render={({ field, fieldState }) => (
                  <div className="space-y-space-sm">
                    <ServiceSelect
                      value={field.value || null}
                      onChange={(code) => {
                        field.onChange(code || "");
                      }}
                      onBlur={field.onBlur}
                      label={t("fields.serviceCode")}
                      placeholder={t("fields.serviceCodePlaceholder")}
                    />
                    {fieldState.error?.message && form.formState.touchedFields.serviceCode && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
              <div className="grid gap-space-xl sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("fields.issueDate")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.issueDate}
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-space-md text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                formatDate(new Date(field.value))
                              ) : (
                                <span>{t("dates.select")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <LazyCalendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              field.onChange(date ?? undefined);
                              field.onBlur();
                            }}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormFieldWithTooltip>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("fields.dueDate")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.dueDate}
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-space-md text-left font-normal",
                                !field.value && "text-muted-foreground",
                              )}
                            >
                              {field.value ? (
                                formatDate(new Date(field.value))
                              ) : (
                                <span>{t("dates.select")}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <LazyCalendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              field.onChange(date ?? undefined);
                              field.onBlur();
                            }}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormFieldWithTooltip>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="valueCents"
                render={({ field, fieldState }) => (
                  <FormFieldWithTooltip
                    label={t("fields.valueCents")}
                    error={fieldState.error?.message}
                    isTouched={!!form.formState.touchedFields.valueCents}
                  >
                    <Input
                      {...field}
                      placeholder="R$ 0,00"
                      inputMode="numeric"
                      onChange={(e) => {
                        const input = e.target.value;
                        const cents = parseTocents(input);
                        field.onChange(cents);
                      }}
                      onBlur={() => {
                        // Ensure clean value on blur
                        if (field.value) {
                          field.onChange(parseTocents(field.value.toString()));
                        }
                        field.onBlur();
                      }}
                      value={field.value ? getDisplayValue(field.value) : ""}
                    />
                  </FormFieldWithTooltip>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field, fieldState }) => (
                  <FormFieldWithTooltip
                    label={t("fields.invoiceNumber")}
                    error={fieldState.error?.message}
                    isTouched={!!form.formState.touchedFields.invoiceNumber}
                  >
                    <Input {...field} placeholder={t("fields.invoiceNumberPlaceholder")} />
                  </FormFieldWithTooltip>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field, fieldState }) => (
                  <FormFieldWithTooltip
                    label={t("fields.status")}
                    error={fieldState.error?.message}
                    isTouched={!!form.formState.touchedFields.status}
                  >
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_VALUES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`status.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormFieldWithTooltip>
                )}
              />
              <FormField
                control={form.control}
                name="materialDeductionCents"
                render={({ field, fieldState }) => (
                  <FormFieldWithTooltip
                    label={t("fields.materialDeductionCents")}
                    error={fieldState.error?.message}
                    isTouched={!!form.formState.touchedFields.materialDeductionCents}
                  >
                    <Input
                      {...field}
                      placeholder="R$ 0,00"
                      inputMode="numeric"
                      onChange={(e) => {
                        const input = e.target.value;
                        const cents = parseTocents(input);
                        field.onChange(cents);
                      }}
                      onBlur={() => {
                        // Ensure clean value on blur
                        if (field.value) {
                          field.onChange(parseTocents(field.value.toString()));
                        }
                        field.onBlur();
                      }}
                      value={field.value ? getDisplayValue(field.value) : ""}
                    />
                  </FormFieldWithTooltip>
                )}
              />
              <div className="grid gap-space-xl sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="issqnPercent"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("table.aliquotaISSQN")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.issqnPercent}
                    >
                      <div className="relative">
                        <Input
                          placeholder="—"
                          inputMode="decimal"
                          value={
                            field.value !== undefined && field.value !== null && field.value !== 0
                              ? String(field.value)
                              : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".");
                            if (raw === "") {
                              field.onChange(0);
                            } else {
                              const n = parseFloat(raw);
                              field.onChange(isNaN(n) ? 0 : n);
                            }
                          }}
                          onBlur={field.onBlur}
                          className="pr-7"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormFieldWithTooltip>
                  )}
                />
                <FormField
                  control={form.control}
                  name="inssPercent"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("table.aliquotaINSS")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.inssPercent}
                    >
                      <div className="relative">
                        <Input
                          placeholder="—"
                          inputMode="decimal"
                          value={
                            field.value !== undefined && field.value !== null && field.value !== 0
                              ? String(field.value)
                              : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".");
                            if (raw === "") {
                              field.onChange(0);
                            } else {
                              const n = parseFloat(raw);
                              field.onChange(isNaN(n) ? 0 : n);
                            }
                          }}
                          onBlur={field.onBlur}
                          className="pr-7"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormFieldWithTooltip>
                  )}
                />
                <FormField
                  control={form.control}
                  name="csPercent"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("table.aliquotaCS")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.csPercent}
                    >
                      <div className="relative">
                        <Input
                          placeholder="—"
                          inputMode="decimal"
                          value={
                            field.value !== undefined && field.value !== null && field.value !== 0
                              ? String(field.value)
                              : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".");
                            if (raw === "") {
                              field.onChange(0);
                            } else {
                              const n = parseFloat(raw);
                              field.onChange(isNaN(n) ? 0 : n);
                            }
                          }}
                          onBlur={field.onBlur}
                          className="pr-7"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormFieldWithTooltip>
                  )}
                />
                <FormField
                  control={form.control}
                  name="irrfPercent"
                  render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                      label={t("table.aliquotaIRRF")}
                      error={fieldState.error?.message}
                      isTouched={!!form.formState.touchedFields.irrfPercent}
                    >
                      <div className="relative">
                        <Input
                          placeholder="—"
                          inputMode="decimal"
                          value={
                            field.value !== undefined && field.value !== null && field.value !== 0
                              ? String(field.value)
                              : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value.replace(",", ".");
                            if (raw === "") {
                              field.onChange(0);
                            } else {
                              const n = parseFloat(raw);
                              field.onChange(isNaN(n) ? 0 : n);
                            }
                          }}
                          onBlur={field.onBlur}
                          className="pr-7"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </FormFieldWithTooltip>
                  )}
                />
              </div>
            </form>
          </Form>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tc("buttons.cancel")}
          </Button>
          <LoadingButton
            type="submit"
            form="invoice-form"
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
