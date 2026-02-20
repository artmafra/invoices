"use client";

import { useEffect } from "react";
import type { InvoiceStatus } from "@/schema/invoices.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { createInvoiceSchema } from "@/validations/invoice.validations";
import { useDateFormat } from "@/hooks/use-date-format";
import { LazyCalendar } from "@/components/shared/lazy-calendar";
import { LoadingButton } from "@/components/shared/loading-button";
import { UserSelect } from "@/components/shared/user-select";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_VALUES: InvoiceStatus[] = ["Emitida", "Paga", "Cancelada"];

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
  const { formatDate } = useDateFormat();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      supplierCnpj: "",
      serviceCode: "",
      issueDate: new Date(),
      dueDate: new Date(),
      entryDate: new Date(),
      valueCents: 0,
      invoiceNumber: "",
      status: "Emitida",
      materialDeductionCents: 0,
      ...initialData,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        supplierCnpj: "",
        serviceCode: "",
        issueDate: new Date(),
        dueDate: new Date(),
        entryDate: new Date(),
        valueCents: 0,
        invoiceNumber: "",
        status: "Emitida",
        materialDeductionCents: 0,
        ...initialData,
      });
    }
  }, [open, initialData, form]);

  const handleSubmit = (data: InvoiceFormValues) => {
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar nota fiscal" : "Nova nota fiscal"}</DialogTitle>
        </DialogHeader>
        <DialogBody className="max-h-[80vh] overflow-y-auto">
          <DialogDescription className="mb-space-lg">
            {isEditing ? "Faça alterações na nota fiscal abaixo." : "Crie uma nova nota fiscal."}
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"CNPJ Do Fornecedor"}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={"Digite o CNPJ do Fornecedor"} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"Código de Serviço"}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={"Digite o Código de Serviço"} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-space-xl sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{"Data de Emissão"}</FormLabel>
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
                                <span>{"Selecione a Data"}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <LazyCalendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ?? undefined)}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>{"Data de Vencimento"}</FormLabel>
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
                                <span>{"Selecione a Data"}</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <LazyCalendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ?? undefined)}
                            disabled={(date) => date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="valueCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"Valor da Nota"}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        placeholder={"Digite o valor da nota"}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value, 10) : 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"Número da Nota Fiscal"}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={"Digite o Número da Nota Fiscal"} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"Status da Nota Fiscal"}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_VALUES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {`${status}`}
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
                name="materialDeductionCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{"Dedução Material"}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        inputMode="numeric"
                        placeholder={"Digite a Dedução Material"}
                        onChange={(e) =>
                          field.onChange(e.target.value ? parseInt(e.target.value, 10) : 0)
                        }
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
            {"Cancelar"}
          </Button>
          <LoadingButton
            type="submit"
            form="invoice-form"
            loading={isSaving}
            loadingText={isEditing ? "Salvando..." : "Criando..."}
          >
            {isEditing ? "Salvar" : "Criar"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
