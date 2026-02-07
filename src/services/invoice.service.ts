import { mapInvoiceToPdfDTO } from "@/mappers/invoice-pdf.mapper";
import { mapServiceToPdfDTO } from "@/mappers/service-pdf.mapper";
import { mapSupplierToPdfDTO } from "@/mappers/supplier-pdf.mapper";
import { type CreateInvoiceSchema, type UpdateInvoiceSchema } from "@/schema/invoices.schema";
import { type TaxRegime } from "@/schema/services.schema";
import { invoiceStorage } from "@/storage/runtime/invoice";
import { serviceStorage } from "@/storage/runtime/service";
import { supplierStorage } from "@/storage/runtime/supplier";
import { InvoicePdfTemplate } from "@/emails/invoice-pdf";
import { renderEmailBoth } from "@/emails/render";

export class InvoiceService {
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
    await invoiceStorage.findById(id);
  }

  async getInvoiceByDueDate(dueDate: Date) {
    await invoiceStorage.findMany({ dueDate });
  }

  async getInvoiceByIssueDate(issueDate: Date) {
    await invoiceStorage.findMany({ issueDate });
  }

  async getInvoiceByEntryDate(entryDate: Date) {
    await invoiceStorage.findMany({ entryDate });
  }

  async updateInvoice(id: string, data: UpdateInvoiceSchema) {
    const updatedData = {
      id,
      ...data,
    };
    await invoiceStorage.update(id, updatedData);
  }

  async deleteInvoice(id: string) {
    await invoiceStorage.delete(id);
  }

  // async generatePDF(id:string): Promise<Buffer>{
  //   const invoice = await invoiceStorage.findById(id)
  //   if(!invoice){
  //     throw new Error("Invoice not found")
  //   }

  //   const supplier = await supplierStorage.findById(invoice.supplierCnpj)
  //   if(!supplier){
  //     throw new Error("Supplier not found")
  //   }

  //   const service = await serviceStorage.findById(invoice.serviceCode)
  //   if(!service){
  //     throw new Error("Service not found")
  //   }

  //   const invoiceDTO = mapInvoiceToPdfDTO(invoice)
  //   const supplierDTO = mapSupplierToPdfDTO(supplier)
  //   const serviceDTO = mapServiceToPdfDTO(service)

  //   try {
  //     const { buffer } = await renderEmailBoth(
  //       <InvoicePdfTemplate
  //         invoice={invoiceDTO}
  //         supplier={supplierDTO}
  //         service={serviceDTO}
  //       />
  //     );
  //     console.error("Invoice PDF generated", { invoiceId: id });
  //     return buffer;
  //   } catch (error) {
  //     console.error("Failed to generate PDF", {
  //       invoiceId: id,
  //       error: error instanceof Error ? error.message : String(error),
  //     });
  //     throw error;
  //   }
  // }
}
