import { notesTable } from "@/schema/notes.schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ========================================
// Admin Note Response Schema
// ========================================

// Base schema from database table
const adminNoteBaseSchema = createSelectSchema(notesTable).pick({
  id: true,
  title: true,
  content: true,
  color: true,
  isPinned: true,
  isArchived: true,
  createdById: true,
  updatedById: true,
});

// Extended schema with relations and JSON serialization
export const adminNoteResponseSchema = adminNoteBaseSchema
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
    tags: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        color: z.string().nullable(),
      }),
    ),
  })
  .strict();

// ========================================
// Admin Notes List Response Schema (Paginated)
// ========================================

export const adminNotesListResponseSchema = z.object({
  data: z.array(adminNoteResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

// ========================================
// Type Exports
// ========================================

export type AdminNoteResponse = z.infer<typeof adminNoteResponseSchema>;
export type AdminNotesListResponse = z.infer<typeof adminNotesListResponseSchema>;
