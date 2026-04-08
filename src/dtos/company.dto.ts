import type { Company } from "@/schema/companies.schema";
import type {
  AdminCompaniesListResponse,
  AdminCompanyResponse,
} from "@/types/companies/companies.types";
import type { PaginatedResult } from "@/storage/types";
import { transformPaginatedResult } from "./base-dto.helper";

export class CompanyDTO {
  static toAdminResponse(company: Company) {
    return {
      id: company.id,
      cnpj: company.cnpj,
      name: company.name,
      city: company.city,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    };
  }

  static toPaginatedResponse(result: PaginatedResult<Company>): AdminCompaniesListResponse {
    return transformPaginatedResult(result, (company) => this.toAdminResponse(company));
  }
}
