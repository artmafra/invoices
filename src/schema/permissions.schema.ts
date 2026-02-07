import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const permissionsTable = pgTable("permissions", {
  id: uuid("id").primaryKey().notNull(),
  resource: varchar("resource", { length: 100 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
});

export type Permission = typeof permissionsTable.$inferSelect;
export type PermissionNew = typeof permissionsTable.$inferInsert;
