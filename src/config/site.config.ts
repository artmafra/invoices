/**
 * Site Configuration
 *
 * Central config for branding values sourced from environment variables.
 * These are static at build time and cannot be changed at runtime.
 */

export const siteConfig = {
  /** Company/website name */
  name: "Template",

  /** Website tagline or slogan */
  tagline: "Build websites faster with this modern template",

  /** Default meta description for SEO (recommended: 150-160 characters) */
  description: "A modern Next.js website template with authentication, admin dashboard, and more.",

  /** Default meta keywords for SEO */
  keywords: "template, nextjs, website, seo",

  /** Default Open Graph image URL for social sharing (recommended: 1200x630px) */
  ogImage: "",

  /** Logo URL for email templates (PNG format, ~64px height recommended) */
  emailLogoUrl: "https://i.imgur.com/BZAqLOF.png",

  /** Help/support URL for email footer */
  helpUrl: "",
} as const;

/**
 * Image Upload Limits
 *
 * Security limits to prevent decompression bomb attacks where a small
 * compressed file (e.g., 50KB) decompresses to huge dimensions (e.g., 1GB).
 */
export const imageUploadLimits = {
  /** Maximum dimension (width or height) in pixels */
  maxDimensionPixels: 4096,
  /** Maximum total pixel count (width × height) */
  maxTotalPixels: 50_000_000, // 50MP
} as const;
