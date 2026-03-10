import { InsertServiceSchema, UpdateServiceSchema } from "@/schema/services.schema";
import { serviceStorage } from "@/storage/runtime/service";

export class ServiceService {
  async getAllServices() {
    return await serviceStorage.findMany();
  }

  async getServiceByCode(code: string) {
    return await serviceStorage.findById(code);
  }

  async updateService(code: string, data: UpdateServiceSchema) {
    const updatedData = {
      code,
      ...data,
    };
    return await serviceStorage.update(code, updatedData);
  }

  async createService(data: InsertServiceSchema) {
    return await serviceStorage.create(data);
  }

  async deleteService(code: string) {
    return await serviceStorage.delete(code);
  }
}
