import { InvoicePdfDTO } from "@/dtos/invoice-pdf.dto";
import { Invoice } from "@/schema/invoices.schema";

export function mapInvoiceToPdfDTO(invoice: Invoice): InvoicePdfDTO {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate.toLocaleDateString(),
    dueDate: invoice.dueDate.toLocaleDateString(),
    entryDate: invoice.entryDate.toLocaleDateString(),
    valueCents: invoice.valueCents,
    materialDeductionCents: invoice.materialDeductionCents,
    netAmountCents: invoice.netAmountCents,
    status: invoice.status,
  };
}
