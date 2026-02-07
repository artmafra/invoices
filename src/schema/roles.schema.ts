import { boolean, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const rolesTable = pgTable("roles", {
  id: uuid("id").primaryKey().notNull(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  isProtected: boolean("is_protected").default(false).notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Role = typeof rolesTable.$inferSelect;
export type RoleNew = typeof rolesTable.$inferInsert;
