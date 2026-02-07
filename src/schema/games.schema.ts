import { usersTable } from "@/schema/users.schema";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Coop Games table
 * Track cooperative games for potential play sessions
 */
export const gamesTable = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Game name (unique to prevent duplicates) */
    name: varchar("name", { length: 255 }).notNull().unique(),
    /** Cover image URL (stored in GCS) */
    coverImage: text("cover_image"),
    /** Xbox store link */
    xboxStoreLink: text("xbox_store_link"),
    /** Rating 0-5 (0 = not rated) */
    rating: integer("rating").default(0).notNull(),
    /** Whether the multiplayer is functional */
    multiplayerFunctional: boolean("multiplayer_functional").default(false).notNull(),
    /** Whether we've tried this game (attempted to play) */
    tried: boolean("tried").default(false).notNull(),
    /** Whether we've played this game */
    played: boolean("played").default(false).notNull(),
    /** Reason for dropping/not playing */
    dropReason: text("drop_reason"),
    /** General notes/comments about the game */
    notes: text("notes"),
    /** User who created the entry */
    createdById: uuid("created_by_id").references(() => usersTable.id, { onDelete: "set null" }),
    /** User who last updated the entry */
    updatedById: uuid("updated_by_id").references(() => usersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("games_created_by_id_idx").on(table.createdById),
    index("games_updated_by_id_idx").on(table.updatedById),
  ],
);

export type Game = typeof gamesTable.$inferSelect;
export type GameNew = typeof gamesTable.$inferInsert;
