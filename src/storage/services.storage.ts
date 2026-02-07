import {
  tableServices,
  type InsertServiceSchema,
  type Service,
  type UpdateServiceSchema,
} from "@/schema/services.schema";
import { eq } from "drizzle-orm";
import { db } from "@/db/postgres";
import type { BaseStorage } from "@/storage/types";

export class ServicesStorage implements BaseStorage<
  Service,
  InsertServiceSchema,
  UpdateServiceSchema
> {
  async findMany() {
    return await db.select().from(tableServices);
  }

  async create(data: InsertServiceSchema) {
    const result = await db.insert(tableServices).values(data).returning();
    return result[0];
  }

  async update(code: string, data: UpdateServiceSchema) {
    const result = await db
      .update(tableServices)
      .set(data)
      .where(eq(tableServices.code, code))
      .returning();
    return result[0];
  }

  async delete(code: string) {
    await db.delete(tableServices).where(eq(tableServices.code, code));
    return true;
  }

  async findById(code: string) {
    return await db
      .select()
      .from(tableServices)
      .where(eq(tableServices.code, code))
      .then((res) => res[0]);
  }
}
