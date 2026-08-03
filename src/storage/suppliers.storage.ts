import {
  tableSuppliers,
  type InsertSupplierSchema,
  type Supplier,
  type UpdateSupplierSchema,
} from "@/schema/suppliers.schema";
import type { SupplierTaxRegime } from "@/schema/suppliers.schema";
import { and, asc, count, desc, eq, ilike, max, or, SQL } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { db } from "@/db/postgres";
import { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";
import { accentInsensitiveIlike } from "./helpers/accent-insensitive-search";
import { paginate } from "./helpers/pagination";

export interface SupplierFilterOptions {
  search?: string;
  companyId?: string;
  city?: string;
  taxRegime?: SupplierTaxRegime;
  name?: string;
  cnpj?: string;
}

export class SuppliersStorage implements BaseStorage<
  Supplier,
  InsertSupplierSchema,
  UpdateSupplierSchema,
  string
> {
  private buildWhereConditions(filters?: SupplierFilterOptions) {
    const conditions: SQL<unknown>[] = [];

    if (!filters) return conditions;

    if (filters.companyId) {
      conditions.push(eq(tableSuppliers.companyId, filters.companyId));
    }

    if (filters.city) {
      conditions.push(accentInsensitiveIlike(tableSuppliers.city, `%${filters.city}%`));
    }

    if (filters.cnpj) {
      conditions.push(ilike(tableSuppliers.cnpj, `%${filters.cnpj}%`));
    }

    if (filters.name) {
      conditions.push(accentInsensitiveIlike(tableSuppliers.name, `%${filters.name}%`));
    }

    if (filters.taxRegime) {
      conditions.push(eq(tableSuppliers.taxRegime, filters.taxRegime));
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          accentInsensitiveIlike(tableSuppliers.name, pattern),
          ilike(tableSuppliers.cnpj, pattern),
        )!,
      );
    }

    return conditions;
  }

  async getCollectionVersion(
    filters: SupplierFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("suppliers", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(tableSuppliers.updatedAt),
          count: count(tableSuppliers.id),
        })
        .from(tableSuppliers);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }

  private buildOrderBy(sortBy?: string, sortOrder?: "asc" | "desc") {
    const direction = sortOrder === "asc" ? asc : desc;

    switch (sortBy) {
      case "name":
        return direction(tableSuppliers.name);
      case "city":
        return direction(tableSuppliers.city);
      case "taxRegime":
        return direction(tableSuppliers.taxRegime);
      case "cnpj":
        return direction(tableSuppliers.cnpj);
      case "updatedAt":
        return direction(tableSuppliers.updatedAt);
      case "createdAt":
        return direction(tableSuppliers.createdAt);
      default:
        return direction(tableSuppliers.name);
    }
  }

  async findManyPaginated(
    filters: SupplierFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Supplier>> {
    const { sortBy, sortOrder } = options;
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let countQuery = db.select({ count: count(tableSuppliers.id) }).from(tableSuppliers);

    let dataQuery = db.select().from(tableSuppliers).orderBy(orderBy).$dynamic();

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause);
    }

    return paginate({
      dataQuery,
      countQuery,
      options,
    });
  }

  async findMany(filters?: SupplierFilterOptions) {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db.select().from(tableSuppliers).orderBy(asc(tableSuppliers.name));
    return whereClause ? query.where(whereClause) : query;
  }

  async create(data: InsertSupplierSchema) {
    const result = await db.insert(tableSuppliers).values(data).returning();
    return result[0];
  }

  async update(id: string, data: UpdateSupplierSchema) {
    const result = await db
      .update(tableSuppliers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(tableSuppliers.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string) {
    await db.delete(tableSuppliers).where(eq(tableSuppliers.id, id)).returning();
    return true;
  }

  async deleteByCompanyId(companyId: string) {
    await db.delete(tableSuppliers).where(eq(tableSuppliers.companyId, companyId));
  }

  async findById(id: string) {
    return await db
      .select()
      .from(tableSuppliers)
      .where(eq(tableSuppliers.id, id))
      .then((res) => res[0]);
  }

  async findByCnpj(cnpj: string) {
    return await db
      .select()
      .from(tableSuppliers)
      .where(eq(tableSuppliers.cnpj, cnpj))
      .then((res) => res[0]);
  }

  async findByCnpjAndCompany(cnpj: string, companyId: string) {
    return await db
      .select()
      .from(tableSuppliers)
      .where(and(eq(tableSuppliers.cnpj, cnpj), eq(tableSuppliers.companyId, companyId)))
      .then((res) => res[0]);
  }
}
