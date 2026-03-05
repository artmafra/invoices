import {
  tableSuppliers,
  type InsertSupplierSchema,
  type Supplier,
  type UpdateSupplierSchema,
} from "@/schema/suppliers.schema";
import type { SupplierTaxRegime } from "@/schema/suppliers.schema";
import { and, asc, count, desc, eq, max, SQL } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { db } from "@/db/postgres";
import { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";
import { paginate } from "./helpers/pagination";

export interface SupplierFilterOptions {
  search?: string;
  city?: string;
  taxRegime?: SupplierTaxRegime;
  name?: string;
  cnpj?: string;
}

export class SuppliersStorage implements BaseStorage<Supplier, InsertSupplierSchema, UpdateSupplierSchema, number> {
  private buildWhereConditions(filters?: SupplierFilterOptions) {
    const conditions: SQL<unknown>[] = [];

    if (!filters) return conditions;

    if (filters.city) {
      conditions.push(eq(tableSuppliers.city, filters.city));
    }

    if (filters.cnpj) {
      conditions.push(eq(tableSuppliers.cnpj, filters.cnpj));
    }

    if (filters.name) {
      conditions.push(eq(tableSuppliers.name, filters.name));
    }

    if (filters.taxRegime) {
      conditions.push(eq(tableSuppliers.taxRegime, filters.taxRegime));
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

  async findMany() {
    return await db.select().from(tableSuppliers);
  }

  async create(data: InsertSupplierSchema) {
    const result = await db.insert(tableSuppliers).values(data).returning();
    return result[0];
  }

  async update(id: number, data: UpdateSupplierSchema) {
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

  async delete(id: number) {
    await db.delete(tableSuppliers).where(eq(tableSuppliers.id, id)).returning();
    return true;
  }

  async findById(id: number) {
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
}
