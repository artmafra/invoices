import {
  tableServices,
  type InsertServiceSchema,
  type Service,
  type UpdateServiceSchema,
} from "@/schema/services.schema";
import { asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db/postgres";
import type { BaseStorage, PaginatedResult } from "@/storage/types";

export class ServicesStorage implements BaseStorage<
  Service,
  InsertServiceSchema,
  UpdateServiceSchema
> {
  async findMany() {
    return await db
      .select()
      .from(tableServices)
      .orderBy(
        sql`CAST(substring(${tableServices.code} from '^[0-9]+') AS INTEGER)`,
        asc(tableServices.code),
      );
  }

  async findManyPaginated(
    filters: { search?: string } = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResult<Service>> {
    const whereConditions = filters.search
      ? or(
          ilike(tableServices.code, `%${filters.search}%`),
          ilike(tableServices.description, `%${filters.search}%`),
        )
      : undefined;

    const [totalResult, data] = await Promise.all([
      db
        .select({ count: count() })
        .from(tableServices)
        .where(whereConditions)
        .then((r) => r[0].count),
      db
        .select()
        .from(tableServices)
        .where(whereConditions)
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
}
