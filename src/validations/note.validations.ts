import { z } from "zod";

// ========================================
// Note Constants
// ========================================

export const MAX_TAGS_PER_NOTE = 5;

// ========================================
// Note Param Schemas
// ========================================

export const noteIdParamSchema = z.object({
  noteId: z.uuid("Invalid note ID format"),
});

export type NoteIdParam = z.infer<typeof noteIdParamSchema>;

// ========================================
// Note Validation Schemas
// ========================================

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a valid hex color code (e.g., #ef4444)");

export const createNoteSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  content: z.string().min(1, "Content is required"),
  isPinned: z.boolean().optional(),
  color: hexColorSchema.optional(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(MAX_TAGS_PER_NOTE, `Maximum ${MAX_TAGS_PER_NOTE} tags allowed`)
    .optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
  color: hexColorSchema.nullable().optional(),
  tags: z
    .array(z.string().min(1).max(50))
    .max(MAX_TAGS_PER_NOTE, `Maximum ${MAX_TAGS_PER_NOTE} tags allowed`)
    .optional(),
});

export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
