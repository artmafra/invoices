import type { ServicePdfDTO } from "@/dtos/service-pdf.dto";
import type { Service } from "@/schema/services.schema";

export function mapServiceToPdfDTO(service: Service): ServicePdfDTO {
  return {
    code: service.code,
    description: service.description,
    debit: service.debit,
  };
}
