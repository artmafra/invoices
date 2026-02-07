import { pgTable, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";

export const tableSuppliers = pgTable("suppliers", {
  cnpj: text("cnpj").primaryKey(),
  name: text("name").notNull().unique(),
  city: text("city").notNull(),
  taxRegime: text("taxRegime", { enum: ["sn", "n", "mei"] }).notNull(),
  obs: text("obs"),
});

export const insertSupplierSchema = createInsertSchema(tableSuppliers).extend({
  cnpj: z
    .string()
    .trim()
    .regex(/^\d{14}$/),
  name: z.string().trim().toUpperCase(),
  city: z.string().trim(),
});
export const updateSupplierSchema = createUpdateSchema(tableSuppliers);

export type Supplier = typeof tableSuppliers.$inferSelect;
export type InsertSupplierSchema = z.infer<typeof insertSupplierSchema>;
export type UpdateSupplierSchema = z.infer<typeof updateSupplierSchema>;
