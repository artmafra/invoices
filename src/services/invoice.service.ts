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
    const supplier = await supplierStorage.findById(data.supplierCnpj);
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    const service = await serviceStorage.findById(data.serviceCode);
    if (!service) {
      throw new Error("Service not found");
    }
    const taxRegime = supplier.taxRegime.toLowerCase() as TaxRegime;
    const rates = service[taxRegime];

    const material = data.materialDeductionCents || 0;
    const value = data.valueCents || 0;

    let tax = 0;

    const inss = data.inssPercent || rates.inss;

    if (inss) {
      const taxValue = value * (inss / 100);
      const taxMaterial = material * (inss / 100);
      tax = taxValue - taxMaterial;
    }

    if (rates.cs) {
      if (value * (rates.cs / 100) >= 1000) {
        const taxValue = value * (rates.cs / 100);
        tax += taxValue;
      }
    }

    if (rates.irrf) {
      if (value * (rates.irrf / 100) >= 1000) {
        const taxValue = value * (rates.irrf / 100);
        tax += taxValue;
      }
    }

    if (rates.issqn) {
      const taxValue = value * (rates.issqn / 100);
      tax += taxValue;
    }

    const netAmountCents = value - tax;

    await invoiceStorage.create({
      ...data,
      netAmountCents,
    });
  }

  async getAllInvoices() {
    return await invoiceStorage.findMany();
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
}
