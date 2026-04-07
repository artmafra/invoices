import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";

export const tableCompanies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  cnpj: text("cnpj").unique().notNull(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCompanySchema = createInsertSchema(tableCompanies);
export const updateCompanySchema = createUpdateSchema(tableCompanies);

export type Company = typeof tableCompanies.$inferSelect;
export type InsertCompanySchema = z.infer<typeof insertCompanySchema>;
export type UpdateCompanySchema = z.infer<typeof updateCompanySchema>;
