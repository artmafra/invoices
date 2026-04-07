import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const tableCompanies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  cnpj: text("cnpj").unique().notNull(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
