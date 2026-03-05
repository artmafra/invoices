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

  async getSupplierById(id: number) {
    return await supplierStorage.findById(id);
  }

  async getSupplierByCnpj(cnpj: string) {
    return await supplierStorage.findByCnpj(cnpj);
  }

  async createSupplier(data: InsertSupplierSchema) {
    return await supplierStorage.create(data);
  }

  async updateSupplier(id: number, data: UpdateSupplierSchema) {
    return await supplierStorage.update(id, data);
  }

  async deleteSupplier(id: number) {
    return await supplierStorage.delete(id);
  }

  async isSupplierCnpjAvailable(cnpj: string, excludeId?: number): Promise<boolean> {
    const existing = await supplierStorage.findByCnpj(cnpj);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  }
}
