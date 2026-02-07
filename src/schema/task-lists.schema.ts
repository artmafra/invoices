import { usersTable } from "@/schema/users.schema";
import { index, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Task Lists table
 * Groups tasks into lists (e.g., "Sprint 1", "Backlog", "Personal")
 */
export const taskListsTable = pgTable(
  "task_lists",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** List name */
    name: varchar("name", { length: 255 }).notNull(),
    /** Optional description */
    description: text("description"),
    /** Optional color for visual organization */
    color: varchar("color", { length: 20 }),
    /** Display order */
    sortOrder: integer("sort_order").default(0).notNull(),
    /** User who created the list */
    createdById: uuid("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("task_lists_created_by_id_idx").on(table.createdById)],
);

export type TaskList = typeof taskListsTable.$inferSelect;
export type TaskListNew = typeof taskListsTable.$inferInsert;
