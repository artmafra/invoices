import { gamesTable } from "@/schema/games.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// Admin Game Response Schema
// ========================================

// Base schema from database table
const adminGameBaseSchema = createSelectSchema(gamesTable).pick({
  id: true,
  name: true,
  rating: true,
  notes: true,
  played: true,
  multiplayerFunctional: true,
  dropReason: true,
  createdById: true,
  updatedById: true,
});

// Extended schema with relations and JSON serialization
export const adminGameResponseSchema = adminGameBaseSchema
  .extend({
    // Date fields as strings for JSON serialization
    createdAt: z.string(),
    updatedAt: z.string(),
    // Related entities
    createdBy: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
      })
      .nullable(),
    updatedBy: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        email: z.string(),
      })
      .nullable(),
  })
  .strict();

// ========================================
// Admin Games List Response Schema (Paginated)
// ========================================

export const adminGamesListResponseSchema = z.object({
  data: z.array(adminGameResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ========================================
// Type Exports
// ========================================

export type AdminGameResponse = z.infer<typeof adminGameResponseSchema>;
export type AdminGamesListResponse = z.infer<typeof adminGamesListResponseSchema>;
