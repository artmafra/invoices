import { z } from "zod";

// ========================================
// Storage Param Schemas
// ========================================

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
    .refine(
      (segments) => {
        // Validate each segment
        for (const segment of segments) {
          if (!segment || segment === "." || segment === "..") {
            return false;
          }
          if (segment.includes("/") || segment.includes("\\")) {
            return false;
          }
          if (!/^[a-zA-Z0-9._-]+$/.test(segment)) {
            return false;
          }
        }
        return true;
      },
      { message: "Invalid image key" },
    )
    .refine(
      (segments) => {
        // Ensure the key starts with "images/"
        const objectKey = segments.join("/");
        return objectKey.startsWith("images/");
      },
      { message: "Invalid image key" },
    )
    .transform((segments) => segments.join("/")), // Return as string path
});

export type StorageKeyParam = z.infer<typeof storageKeyParamSchema>;
