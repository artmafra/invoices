import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Settings table for application configuration
export const settingsTable = pgTable("settings", {
  id: uuid("id").primaryKey().notNull(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 255 }).notNull(), // Human-readable label for the setting
  value: text("value").notNull().default(""), // Setting value (always string, parsed by type)
  type: varchar("type", { length: 50 }).default("string").notNull(), // string, boolean, number, json, image, select
  options: text("options"), // JSON array of options for select type (e.g., '["option1", "option2"]')
  description: text("description").notNull().default(""), // Human-readable description
  category: varchar("category", { length: 50 }).default("general").notNull(),
  scope: varchar("scope", { length: 20 }).default("system").notNull(), // "public" or "system"
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
});

export type Setting = typeof settingsTable.$inferSelect;
export type SettingNew = typeof settingsTable.$inferInsert;
