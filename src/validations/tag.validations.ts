import { z } from "zod";

// ========================================
// Tag Validation Schemas
// ========================================

export const searchTagsSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

export type SearchTagsInput = z.infer<typeof searchTagsSchema>;
