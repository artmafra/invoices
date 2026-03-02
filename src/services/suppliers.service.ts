import { SupplierDTO } from "@/dtos/supplier.dto";
import { InsertSupplierSchema, UpdateSupplierSchema } from "@/schema/suppliers.schema";
import { AdminSuppliersListResponse } from "@/types/suppliers/suppliers.types";
import { supplierStorage } from "@/storage/runtime/supplier";
import { SupplierFilterOptions } from "@/storage/suppliers.storage";
import { PaginationOptions } from "@/storage/types";

export class SupplierService {
  async getPaginated(
    filters?: SupplierFilterOptions,
    options?: PaginationOptions,
  ): Promise<AdminSuppliersListResponse> {
    const result = await supplierStorage.findManyPaginated(filters, options);
    return SupplierDTO.toPaginatedResponse(result);
  }

  async getCollectionVersion(filters?: SupplierFilterOptions) {
    return await supplierStorage.getCollectionVersion(filters);
  }

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

  async isSupplierAvailable(cnpj: string, excludeId?: string): Promise<boolean> {
    const existing = await supplierStorage.findById(cnpj);
    if (!existing) return true;
    if (excludeId && existing.cnpj === excludeId) return true;
    return false;
  }
}
