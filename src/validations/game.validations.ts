import { z } from "zod";
import { baseQuerySchema } from "./query.validations";

// ========================================
// Game Query Schemas
// ========================================

export const getGamesQuerySchema = baseQuerySchema.extend({
  played: z
    .enum(["true", "false", "dropped"])
    .transform((val) => {
      if (val === "true") return true;
      if (val === "false") return false;
      return "dropped" as const;
    })
    .optional(),
  minRating: z.coerce.number().int().min(0).max(5).optional(),
  multiplayerFunctional: z.coerce.boolean().optional(),
});

// ========================================
// Game Param Schemas
// ========================================

export const gameIdParamSchema = z.object({
  gameId: z.uuid("Invalid game ID format"),
});

export type GameIdParam = z.infer<typeof gameIdParamSchema>;

// ========================================
// Game Validation Schemas
// ========================================

export const createGameSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  coverImage: z.url().optional().nullable(),
  xboxStoreLink: z.url().optional().nullable(),
  rating: z.number().int().min(0).max(5).default(0),
  multiplayerFunctional: z.boolean().default(false),
  tried: z.boolean().default(false),
  played: z.boolean().default(false),
  dropReason: z.string().max(1000).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;

export const updateGameSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  coverImage: z.url().nullable().optional(),
  xboxStoreLink: z.url().nullable().optional(),
  rating: z.number().int().min(0).max(5).optional(),
  multiplayerFunctional: z.boolean().optional(),
  tried: z.boolean().optional(),
  played: z.boolean().optional(),
  dropReason: z.string().max(1000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
});

export type UpdateGameInput = z.infer<typeof updateGameSchema>;
