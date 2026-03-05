import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";

export const SUPPLIER_TAX_REGIME = ["sn", "n", "mei"] as const;
export type SupplierTaxRegime = (typeof SUPPLIER_TAX_REGIME)[number];

export const tableSuppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  cnpj: text("cnpj").notNull().unique(),
  name: text("name").notNull().unique(),
  city: text("city").notNull(),
  taxRegime: text("taxRegime", { enum: SUPPLIER_TAX_REGIME }).notNull(),
  obs: text("obs"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
