import type { Supplier } from "@/schema/suppliers.schema";
import type {
  AdminSupplierResponse,
  AdminSuppliersListResponse,
} from "@/types/suppliers/suppliers.types";
import type { PaginatedResult } from "@/storage/types";
import { transformPaginatedResult } from "./base-dto.helper";

export class SupplierDTO {
  static toAdminResponse(supplier: Supplier): AdminSupplierResponse {
    return {
      cnpj: supplier.cnpj,
      name: supplier.name,
      city: supplier.city,
      taxRegime: supplier.taxRegime,
      obs: supplier.obs ?? null,
      createdAt: supplier.createdAt.toISOString(),
      updatedAt: supplier.updatedAt.toISOString(),
    };
  }

  static toPaginatedResponse(result: PaginatedResult<Supplier>): AdminSuppliersListResponse {
    return transformPaginatedResult(result, (supplier) => this.toAdminResponse(supplier));
  }
}
