import type { SupplierPdfDTO } from "@/dtos/supplier-pdf.dto";
import type { Supplier } from "@/schema/suppliers.schema";

export function mapSupplierToPdfDTO(supplier: Supplier): SupplierPdfDTO {
  return {
    cnpj: supplier.cnpj,
    name: supplier.name,
    city: supplier.city,
    taxRegime: supplier.taxRegime,
  };
}
