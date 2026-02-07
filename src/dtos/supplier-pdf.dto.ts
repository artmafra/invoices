import type { TaxRegime } from "@/schema/services.schema";

export interface SupplierPdfDTO {
  cnpj: string;
  name: string;
  city: string;
  taxRegime: TaxRegime;
  obs?: string | null;
}
