import { InsertSupplierSchema, UpdateSupplierSchema } from "@/schema/suppliers.schema";
import { supplierStorage } from "@/storage/runtime/supplier";

export class SupplierService {
  async getAllSuppliers() {
    return await supplierStorage.findMany();
  }

  async getSupplierByCnpj(cnpj: string) {
    return await supplierStorage.findById(cnpj);
  }

  async createSupplier(data: InsertSupplierSchema) {
    return await supplierStorage.create(data);
  }

  async updateSupplier(cnpj: string, data: UpdateSupplierSchema) {
    const updatedData = {
      cnpj,
      ...data,
    };

    return await supplierStorage.update(cnpj, updatedData);
  }

  async deleteSupplier(cnpj: string) {
    return await supplierStorage.delete(cnpj);
  }
}
