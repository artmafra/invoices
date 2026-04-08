import { InsertServiceSchema, UpdateServiceSchema } from "@/schema/services.schema";
import { serviceStorage } from "@/storage/runtime/service";

export class ServiceService {
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
}
