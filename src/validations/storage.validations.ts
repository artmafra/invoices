import { z } from "zod";

// ========================================
// Storage Param Schemas
// ========================================

/**
 * Storage key schema - validates structure only
 * Security validation (path traversal, allowed paths) is done in the route for specific error codes
 */
export const storageKeyParamSchema = z.object({
  key: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      // Convert to array
      const rawSegments = Array.isArray(val) ? val : typeof val === "string" ? [val] : undefined;
      if (!rawSegments || rawSegments.length === 0) {
        throw new Error("No image key provided");
      }

      // Decode URI components
      try {
        return rawSegments.map((segment) => decodeURIComponent(segment));
      } catch {
        throw new Error("Invalid image key");
      }
    })
    .transform((segments) => segments.join("/")), // Return as string path
});

export type StorageKeyParam = z.infer<typeof storageKeyParamSchema>;
