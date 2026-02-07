import { InsertSupplierSchema, UpdateSupplierSchema } from "@/schema/suppliers.schema";
import { supplierStorage } from "@/storage/runtime/supplier";

export class SupplierService {
  async getAllSuppliers() {
    await supplierStorage.findMany();
  }

  async getSupplierByCnpj(cnpj: string) {
    await supplierStorage.findById(cnpj);
  }

  async createSupplier(data: InsertSupplierSchema) {
    await supplierStorage.create(data);
  }

  async updateSupplier(cnpj: string, data: UpdateSupplierSchema) {
    const updatedData = {
      cnpj,
      ...data,
    };

    await supplierStorage.update(cnpj, updatedData);
  }

  async deleteSupplier(cnpj: string) {
    await supplierStorage.delete(cnpj);
  }
}
