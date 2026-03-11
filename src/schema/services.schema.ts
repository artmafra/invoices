import { jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";

export const tableServices = pgTable("services", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
  sn: jsonb("sn").$type<TaxRates>().notNull(),
  n: jsonb("n").$type<TaxRates>().notNull(),
  mei: jsonb("mei").$type<TaxRates>().notNull(),
  obs: text("obs"),
});

export const taxRatesSchema = z.object({
  issqn: z.number().nullable(),
  inss: z.number().nullable(),
  cs: z.number().nullable(),
  irrf: z.number().nullable(),
});

export const insertServiceSchema = createInsertSchema(tableServices, {
  sn: taxRatesSchema,
  n: taxRatesSchema,
  mei: taxRatesSchema,
});

export const updateServiceSchema = createUpdateSchema(tableServices, {
  sn: taxRatesSchema.optional(),
  n: taxRatesSchema.optional(),
  mei: taxRatesSchema.optional(),
});

export type TaxRegime = "sn" | "n" | "mei";
export type TaxRates = {
  issqn: number | null;
  inss: number | null;
  cs: number | null;
  irrf: number | null;
};
export type Service = typeof tableServices.$inferSelect;
export type InsertServiceSchema = z.infer<typeof insertServiceSchema>;
export type UpdateServiceSchema = z.infer<typeof updateServiceSchema>;
