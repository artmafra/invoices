import {
  tableServices,
  type InsertServiceSchema,
  type Service,
  type UpdateServiceSchema,
} from "@/schema/services.schema";
import { and, asc, count, eq, ilike, max, or, sql } from "drizzle-orm";
import { versionCache } from "@/lib/cache/version-cache.service";
import { db } from "@/db/postgres";
import type { BaseStorage, PaginatedResult } from "@/storage/types";

export interface ServiceFilterOptions {
  search?: string;
  companyId?: string;
}

export class ServicesStorage implements BaseStorage<
  Service,
  InsertServiceSchema,
  UpdateServiceSchema
> {
  async findMany(filters: ServiceFilterOptions = {}) {
    const conditions = [];

    if (filters.companyId) {
      conditions.push(eq(tableServices.companyId, filters.companyId));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const query = db
      .select()
      .from(tableServices)
      .orderBy(
        sql`CAST(substring(${tableServices.code} from '^[0-9]+') AS INTEGER)`,
        asc(tableServices.code),
      );

    return whereClause ? query.where(whereClause) : query;
  }

  async findManyPaginated(
    filters: ServiceFilterOptions = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Service>> {
    const conditions = [];

    if (filters.companyId) {
      conditions.push(eq(tableServices.companyId, filters.companyId));
    }

    if (filters.search) {
      conditions.push(
        or(
          ilike(tableServices.code, `%${filters.search}%`),
          ilike(tableServices.description, `%${filters.search}%`),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, data] = await Promise.all([
      db
        .select({ count: count() })
        .from(tableServices)
        .where(whereClause)
        .then((r) => r[0].count),
      db
        .select()
        .from(tableServices)
        .where(whereClause)
        .orderBy(
          sql`CAST(substring(${tableServices.code} from '^[0-9]+') AS INTEGER)`,
          asc(tableServices.code),
        )
        .limit(limit)
        .offset((page - 1) * limit),
    ]);

    return {
      data,
      total: totalResult,
      page,
      limit,
      totalPages: Math.ceil(totalResult / limit),
    };
  }

  async create(data: InsertServiceSchema) {
    const result = await db.insert(tableServices).values(data).returning();
    return result[0];
  }

  async update(id: string, data: UpdateServiceSchema) {
    const result = await db
      .update(tableServices)
      .set(data)
      .where(eq(tableServices.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string) {
    await db.delete(tableServices).where(eq(tableServices.id, id));
    return true;
  }

  async findById(id: string) {
    return await db
      .select()
      .from(tableServices)
      .where(eq(tableServices.id, id))
      .then((res) => res[0]);
  }

  async findByCode(code: string) {
    return await db
      .select()
      .from(tableServices)
      .where(eq(tableServices.code, code))
      .then((res) => res[0]);
  }

  async getCollectionVersion(
    filters: ServiceFilterOptions = {},
  ): Promise<{ maxUpdatedAt: Date | null; count: number }> {
    const cacheKey = versionCache.buildCacheKey("services", filters);

    return versionCache.getOrFetch(cacheKey, async () => {
      const conditions = [];

      if (filters.companyId) {
        conditions.push(eq(tableServices.companyId, filters.companyId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const query = db
        .select({
          maxUpdatedAt: max(tableServices.createdAt),
          count: count(tableServices.id),
        })
        .from(tableServices);

      const [result] = whereClause ? await query.where(whereClause) : await query;

      return {
        maxUpdatedAt: result?.maxUpdatedAt ? new Date(result.maxUpdatedAt) : null,
        count: result?.count ?? 0,
      };
    });
  }
}
