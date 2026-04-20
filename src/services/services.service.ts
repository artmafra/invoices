import { InsertServiceSchema, UpdateServiceSchema } from "@/schema/services.schema";
import { serviceStorage } from "@/storage/runtime/service";
import type { ServiceFilterOptions } from "@/storage/services.storage";

export class ServiceService {
  async getCollectionVersion(filters?: ServiceFilterOptions) {
    return await serviceStorage.getCollectionVersion(filters);
  }

  async getAllServices(companyId?: string) {
    return await serviceStorage.findMany({ companyId });
  }

  async getServicesPaginated(
    filters: { search?: string; companyId?: string } = {},
    page: number = 1,
    limit: number = 20,
  ) {
    return await serviceStorage.findManyPaginated(filters, page, limit);
  }

  async getServiceById(id: string) {
    return await serviceStorage.findById(id);
  }

  async getServiceByCode(code: string) {
    return await serviceStorage.findByCode(code);
  }

  async updateService(id: string, data: UpdateServiceSchema) {
    return await serviceStorage.update(id, data);
  }

  async createService(data: InsertServiceSchema) {
    return await serviceStorage.create(data);
  }

  async deleteService(id: string) {
    return await serviceStorage.delete(id);
  }

  async isServiceCodeAvailable(
    code: string,
    companyId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const existing = await serviceStorage.findByCodeAndCompany(code, companyId);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }
}
