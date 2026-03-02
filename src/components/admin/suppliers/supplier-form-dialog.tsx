"use client";

import { useEffect } from "react";
import { SUPPLIER_TAX_REGIME } from "@/schema/suppliers.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { extractCnpjDigits, formatCnpj } from "@/lib/cnpj-service-code";
import { createSupplierSchema } from "@/validations/supplier.validations";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type SupplierFormValues = z.infer<typeof createSupplierSchema>;

export interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<SupplierFormValues>;
  onSubmit: (data: SupplierFormValues) => void;
  isEditing: boolean;
  isSaving: boolean;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  initialData,
  onSubmit,
  isEditing,
  isSaving,
}: SupplierFormDialogProps) {
  const tc = useTranslations("common");
  const t = useTranslations("apps/suppliers");

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(createSupplierSchema),
    defaultValues: {
      cnpj: "",
      name: "",
      city: "",
      taxRegime: "sn",
      obs: "",
      ...initialData,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        cnpj: "",
        name: "",
        city: "",
        taxRegime: "sn",
        obs: "",
        ...initialData,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: SupplierFormValues) => {
    onSubmit(data);
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.cnpj")}</FormLabel>
                    <FormControl>
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("fields.namePlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.city")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t("fields.cityPlaceholder")} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxRegime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.taxRegime")}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("fields.taxRegimePlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPLIER_TAX_REGIME.map((taxRegime) => (
                          <SelectItem key={taxRegime} value={taxRegime}>
                            {t(`taxRegimes.${taxRegime}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="obs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("fields.obs")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder={t("fields.obsPlaceholder")}
                        rows={3}
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
