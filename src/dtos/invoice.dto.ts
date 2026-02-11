import type { Invoice } from "@/schema/invoices.schema";
import type {
  AdminInvoiceResponse,
  AdminInvoicesListResponse,
} from "@/types/invoices/invoices.types";
import type { InvoiceWithRelations } from "@/storage/invoices.storage";
import type { PaginatedResult } from "@/storage/types";
import { transformPaginatedResult } from "./base-dto.helper";

export class InvoiceDTO {
  static toAdminResponse(invoice: Invoice): Omit<AdminInvoiceResponse, "supplier" | "service"> {
    return {
      id: invoice.id,
      supplierCnpj: invoice.supplierCnpj,
      serviceCode: invoice.serviceCode,
      status: invoice.status,
      valueCents: invoice.valueCents,
      invoiceNumber: invoice.invoiceNumber,
      materialDeductionCents: invoice.materialDeductionCents,
      netAmountCents: invoice.netAmountCents,
      entryDate: invoice.entryDate,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  static toAdminDetailResponse(invoice: InvoiceWithRelations): AdminInvoiceResponse {
    return {
      ...this.toAdminResponse(invoice),
      supplier: invoice.supplier
        ? {
            cnpj: invoice.supplier.cnpj,
            name: invoice.supplier.name,
          }
        : null,
      service: invoice.service
        ? {
            code: invoice.service.code,
            name: invoice.service.name,
          }
        : null,
    };
  }

  static toPaginatedResponse(
    result: PaginatedResult<InvoiceWithRelations>,
  ): AdminInvoicesListResponse {
    return transformPaginatedResult(result, (invoice) => this.toAdminDetailResponse(invoice));
  }
}
