import { notesTable } from "@/schema/notes.schema";
import { index, pgTable, primaryKey, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

/**
 * Tags table
 * Global tags that can be applied to notes
 */
export const tagsTable = pgTable("tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Tag name (unique globally) */
  name: varchar("name", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Note-Tag junction table
 * Many-to-many relationship between notes and tags
 * CASCADE delete: when a note is deleted, remove its tag associations
 * CASCADE delete: when a tag is deleted, remove all note associations
 */
export const noteTagsTable = pgTable(
  "note_tags",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notesTable.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tagsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.noteId, table.tagId] }),
    index("note_tags_tag_id_idx").on(table.tagId),
  ],
);

export type Tag = typeof tagsTable.$inferSelect;
export type TagNew = typeof tagsTable.$inferInsert;
export type NoteTag = typeof noteTagsTable.$inferSelect;
export type NoteTagNew = typeof noteTagsTable.$inferInsert;
