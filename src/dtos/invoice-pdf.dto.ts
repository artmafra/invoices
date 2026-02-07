import type { InvoiceStatus } from "@/schema/invoices.schema";

export interface InvoicePdfDTO {
  id: string;
  invoiceNumber: string;
  entryDate: string;
  issueDate: string;
  dueDate: string;
  valueCents: number;
  materialDeductionCents: number;
  netAmountCents: number;
  status: InvoiceStatus;
}
