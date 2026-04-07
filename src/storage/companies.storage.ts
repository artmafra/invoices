import {
  tableCompanies,
  type Company,
  type InsertCompanySchema,
  type UpdateCompanySchema,
} from "@/schema/companies.schema";
import { and, asc, count, desc, eq, ilike, max, or, type SQL } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { db } from "@/db/postgres";
import type { BaseStorage, PaginatedResult, PaginationOptions } from "@/storage/types";
import { paginate } from "./helpers/pagination";

export interface CompanyFilterOptions {
  search?: string;
  city?: string;
  cnpj?: string;
  name?: string;
}

export class CompanyStorage implements BaseStorage<
  Company,
  InsertCompanySchema,
  UpdateCompanySchema,
  string
> {
  private buildWhereConditions(filters?: CompanyFilterOptions): SQL<unknown>[] {
    const conditions: SQL<unknown>[] = [];

    if (!filters) return conditions;

    if (filters.cnpj) {
      conditions.push(ilike(tableCompanies.cnpj, `%${filters.cnpj}%`));
    }

    if (filters.name) {
      conditions.push(ilike(tableCompanies.name, `%${filters.name}%`));
    }

    if (filters.city) {
      conditions.push(ilike(tableCompanies.city, `%${filters.city}%`));
    }

    if (filters.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(ilike(tableCompanies.name, pattern), ilike(tableCompanies.cnpj, pattern))!,
      );
    }

    return conditions;
  }

  async getCollectionVersion(
    filters: CompanyFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("companies", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = this.buildWhereConditions(filters);
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(tableCompanies.updatedAt),
          count: count(tableCompanies.id),
        })
        .from(tableCompanies);

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
      case "cnpj":
        return direction(tableCompanies.cnpj);
      case "city":
        return direction(tableCompanies.city);
      case "createdAt":
        return direction(tableCompanies.createdAt);
      case "updatedAt":
        return direction(tableCompanies.updatedAt);
      case "name":
      default:
        return direction(tableCompanies.name);
    }
  }

  async findManyPaginated(
    filters: CompanyFilterOptions = {},
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Company>> {
    const { sortBy, sortOrder } = options;
    const orderBy = this.buildOrderBy(sortBy, sortOrder);

    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let countQuery = db.select({ count: count(tableCompanies.id) }).from(tableCompanies);
    let dataQuery = db.select().from(tableCompanies).orderBy(orderBy).$dynamic();

    if (whereClause) {
      countQuery = countQuery.where(whereClause) as typeof countQuery;
      dataQuery = dataQuery.where(whereClause);
    }

    return paginate({ dataQuery, countQuery, options });
  }

  async findMany(filters?: CompanyFilterOptions): Promise<Company[]> {
    const conditions = this.buildWhereConditions(filters);
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db.select().from(tableCompanies).orderBy(asc(tableCompanies.name));
    return whereClause ? query.where(whereClause) : query;
  }

  async findById(id: string): Promise<Company | undefined> {
    return db
      .select()
      .from(tableCompanies)
      .where(eq(tableCompanies.id, id))
      .then((res) => res[0]);
  }

  async findByCnpj(cnpj: string): Promise<Company | undefined> {
    return db
      .select()
      .from(tableCompanies)
      .where(eq(tableCompanies.cnpj, cnpj))
      .then((res) => res[0]);
  }

  async create(data: InsertCompanySchema): Promise<Company> {
    const result = await db.insert(tableCompanies).values(data).returning();
    return result[0];
  }

  async update(id: string, data: UpdateCompanySchema): Promise<Company> {
    const result = await db
      .update(tableCompanies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(tableCompanies.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<boolean> {
    await db.delete(tableCompanies).where(eq(tableCompanies.id, id));
    return true;
  }
}
