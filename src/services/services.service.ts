import { InsertServiceSchema, UpdateServiceSchema } from "@/schema/services.schema";
import { serviceStorage } from "@/storage/runtime/service";

export class ServiceService {
  async getAllServices() {
    await serviceStorage.findMany();
  }

  async getServiceByCode(code: string) {
    await serviceStorage.findById(code);
  }

  async updateService(code: string, data: UpdateServiceSchema) {
    const updatedData = {
      code,
      ...data,
    };
    await serviceStorage.update(code, updatedData);
  }

  async createService(data: InsertServiceSchema) {
    await serviceStorage.create(data);
  }

  async deleteService(code: string) {
    await serviceStorage.delete(code);
  }
}
