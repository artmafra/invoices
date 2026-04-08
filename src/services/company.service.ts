import { CompanyDTO } from "@/dtos/company.dto";
import type { InsertCompanySchema, UpdateCompanySchema } from "@/schema/companies.schema";
import type { AdminCompaniesListResponse } from "@/types/companies/companies.types";
import type { CompanyFilterOptions } from "@/storage/companies.storage";
import { companyStorage } from "@/storage/runtime/company";
import type { PaginationOptions } from "@/storage/types";

export class CompanyService {
  async getCollectionVersion(filters?: CompanyFilterOptions) {
    return await companyStorage.getCollectionVersion(filters);
  }

  async getPaginated(
    filters?: CompanyFilterOptions,
    options?: PaginationOptions,
  ): Promise<AdminCompaniesListResponse> {
    const result = await companyStorage.findManyPaginated(filters, options);

    return CompanyDTO.toPaginatedResponse(result);
  }

  async getAllCompanies() {
    return await companyStorage.findMany();
  }

  async getCompanyById(id: string) {
    return await companyStorage.findById(id);
  }

  async getCompanyByCnpj(cnpj: string) {
    return await companyStorage.findByCnpj(cnpj);
  }

  async isCompanyCnpjAvailable(cnpj: string, excludeId?: string): Promise<boolean> {
    const existing = await companyStorage.findByCnpj(cnpj);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }

  async createCompany(data: InsertCompanySchema) {
    return await companyStorage.create(data);
  }

  async updateCompany(id: string, data: UpdateCompanySchema) {
    return await companyStorage.update(id, data);
  }

  async deleteCompany(id: string) {
    return await companyStorage.delete(id);
  }
}
