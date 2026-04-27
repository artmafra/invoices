import { InvoiceDTO } from "@/dtos/invoice.dto";
import { type CreateInvoiceSchema, type UpdateInvoiceSchema } from "@/schema/invoices.schema";
import { type TaxRegime } from "@/schema/services.schema";
import type { AdminInvoicesListResponse } from "@/types/invoices/invoices.types";
import { InvoiceFilterOptions } from "@/storage/invoices.storage";
import { invoiceStorage } from "@/storage/runtime/invoice";
import { serviceStorage } from "@/storage/runtime/service";
import { supplierStorage } from "@/storage/runtime/supplier";
import type { PaginationOptions } from "@/storage/types";

export class InvoiceService {
  async getPaginated(
    filters?: InvoiceFilterOptions,
    options?: PaginationOptions,
  ): Promise<AdminInvoicesListResponse> {
    const result = await invoiceStorage.findManyPaginated(filters, options);
    return InvoiceDTO.toPaginatedResponse(result);
  }

  async getCollectionVersion(filters?: InvoiceFilterOptions) {
    return invoiceStorage.getCollectionVersion(filters);
  }

  async createInvoice(data: CreateInvoiceSchema) {
    const supplier = await supplierStorage.findByCnpj(data.supplierCnpj);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    const service = await serviceStorage.findByCode(data.serviceCode);
    if (!service) {
      throw new Error("Service not found");
    }
    const taxRegime = supplier.taxRegime.toLowerCase() as TaxRegime;
    const rates = service[taxRegime];

    const material = data.materialDeductionCents || 0;
    const value = data.valueCents || 0;

    // Resolve rates: per-invoice override takes priority over service rate
    const issqn = data.issqnPercent ?? rates.issqn;
    const inss = data.inssPercent ?? rates.inss;
    const cs = data.csPercent ?? rates.cs;
    const irrf = data.irrfPercent ?? rates.irrf;

    let tax = 0;

    if (inss) {
      const taxValue = value * (inss / 100);
      const taxMaterial = material * (inss / 100);
      tax = taxValue - taxMaterial;
    }

    if (cs) {
      if (value * (cs / 100) >= 1000) {
        tax += value * (cs / 100);
      }
    }

    if (irrf) {
      if (value * (irrf / 100) >= 1000) {
        tax += value * (irrf / 100);
      }
    }

    if (issqn) {
      tax += value * (issqn / 100);
    }

    const netAmountCents = Math.round(value - tax);

    return await invoiceStorage.create({
      ...data,
      netAmountCents,
    });
  }

  async getAllInvoices(companyId?: string) {
    return await invoiceStorage.findMany({ companyId });
  }

  async getInvoiceById(id: string) {
    return await invoiceStorage.findById(id);
  }

  async getInvoiceByDueDate(dueDate: Date) {
    return await invoiceStorage.findMany({
      dueDateRange: {
        from: dueDate,
        to: dueDate,
      },
    });
  }

  async getInvoiceByIssueDate(issueDate: Date) {
    return await invoiceStorage.findMany({
      issueDateRange: {
        from: issueDate,
        to: issueDate,
      },
    });
  }

  async getInvoiceByEntryDate(entryDate: Date) {
    return await invoiceStorage.findMany({
      entryDateRange: {
        from: entryDate,
        to: entryDate,
      },
    });
  }

  async updateInvoice(id: string, data: UpdateInvoiceSchema) {
    const updatedData = {
      id,
      ...data,
    };
    return await invoiceStorage.update(id, updatedData);
  }

  async deleteInvoice(id: string) {
    return await invoiceStorage.delete(id);
  }

  async isNumberAvailable(number: string, excludeId?: string): Promise<boolean> {
    const existing = await invoiceStorage.findByNumber(number);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }
}
