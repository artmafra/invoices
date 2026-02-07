import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Module settings table for per-module configuration.
 * Each module can define its own settings via the registry's settingCategories.
 */
export const moduleSettingsTable = pgTable("module_settings", {
  id: uuid("id").primaryKey().notNull(),
  /** Registry module ID (e.g., "notes", "tasks") */
  moduleId: varchar("module_id", { length: 50 }).notNull(),
  /** Setting key (unique per module) */
  key: varchar("key", { length: 100 }).notNull(),
  /** Setting value (stored as string, parsed by type) */
  value: text("value").notNull().default(""),
  /** Setting type: string, boolean, number, json, image, select */
  type: varchar("type", { length: 50 }).default("string").notNull(),
  /** JSON array of options for select type */
  options: text("options"),
  /** Human-readable label */
  label: varchar("label", { length: 255 }).notNull(),
  /** Human-readable description */
  description: text("description").notNull().default(""),
  /** Category within the module's settings */
  category: varchar("category", { length: 50 }).default("general").notNull(),
  createdAt: timestamp("created_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).defaultNow().notNull(),
});

export type ModuleSetting = typeof moduleSettingsTable.$inferSelect;
export type ModuleSettingNew = typeof moduleSettingsTable.$inferInsert;
