import {
  tableServices,
  type InsertServiceSchema,
  type Service,
  type UpdateServiceSchema,
} from "@/schema/services.schema";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db/postgres";
import type { BaseStorage } from "@/storage/types";

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
