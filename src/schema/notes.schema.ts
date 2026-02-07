import { usersTable } from "@/schema/users.schema";
import { boolean, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Notes table
 * Simple internal notes/memos for admin users
 */
export const notesTable = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Note title */
    title: varchar("title", { length: 255 }).notNull(),
    /** Note content (markdown supported) */
    content: text("content").notNull(),
    /** Pin important notes to the top */
    isPinned: boolean("is_pinned").default(false).notNull(),
    /** Optional color label for visual organization */
    color: varchar("color", { length: 20 }),
    /** Archive notes to remove from main view */
    isArchived: boolean("is_archived").default(false).notNull(),
    /** User who created the note */
    createdById: uuid("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
    /** User who last updated the note */
    updatedById: uuid("updated_by_id").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("notes_created_by_id_idx").on(table.createdById),
    index("notes_updated_by_id_idx").on(table.updatedById),
    index("notes_is_archived_idx").on(table.isArchived),
    index("notes_is_pinned_idx").on(table.isPinned),
  ],
);

export type Note = typeof notesTable.$inferSelect;
export type NoteNew = typeof notesTable.$inferInsert;
