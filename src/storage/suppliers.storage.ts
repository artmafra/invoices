import {
  tableSuppliers,
  type InsertSupplierSchema,
  type Supplier,
  type UpdateSupplierSchema,
} from "@/schema/suppliers.schema";
import { eq } from "drizzle-orm";
import { db } from "@/db/postgres";
import { BaseStorage } from "@/storage/types";

export class SuppliersStorage implements BaseStorage<Supplier> {
  async findMany() {
    return await db.select().from(tableSuppliers);
  }

  async create(data: InsertSupplierSchema) {
    const result = await db.insert(tableSuppliers).values(data).returning();
    return result[0];
  }

  async update(cnpj: string, data: UpdateSupplierSchema) {
    const result = await db
      .update(tableSuppliers)
      .set(data)
      .where(eq(tableSuppliers.cnpj, cnpj))
      .returning();
    return result[0];
  }

  async delete(cnpj: string) {
    await db.delete(tableSuppliers).where(eq(tableSuppliers.cnpj, cnpj)).returning();
    return true;
  }

  async findById(cnpj: string) {
    return await db
      .select()
      .from(tableSuppliers)
      .where(eq(tableSuppliers.cnpj, cnpj))
      .then((res) => res[0]);
  }
}
