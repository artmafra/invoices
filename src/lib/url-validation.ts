/**
 * URL validation utilities
 * Addresses FRONTEND_SECURITY_AUDIT finding #4 - URL parameter open redirect risk
 */

/**
 * Check if a URL is internal (same origin) or relative
 * Prevents open redirect vulnerabilities from user-controlled URLs
 *
 * @param url - URL to validate
 * @returns true if URL is safe (internal or relative), false otherwise
 *
 * @example
 * isInternalUrl('/dashboard') // true
 * isInternalUrl('https://example.com') // true (if same origin)
 * isInternalUrl('https://evil.com') // false
 */
export function isInternalUrl(url: string): boolean {
  try {
    // Allow relative URLs (start with /)
    if (url.startsWith("/")) {
      return true;
    }

    // Parse URL to check origin
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin === window.location.origin;
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Sanitize a redirect URL to prevent open redirect attacks
 * Returns the URL if internal, otherwise returns fallback
 *
 * @param url - URL to sanitize
 * @param fallback - Fallback URL if invalid (default: '/')
 * @returns Safe URL
 *
 * @example
 * sanitizeRedirectUrl('/dashboard') // '/dashboard'
 * sanitizeRedirectUrl('https://evil.com', '/') // '/'
 */
export function sanitizeRedirectUrl(url: string | null | undefined, fallback = "/"): string {
  if (!url) return fallback;
  return isInternalUrl(url) ? url : fallback;
}

/**
 * Validate a search query string to prevent XSS
 * Removes potentially dangerous characters
 *
 * @param query - Search query to validate
 * @returns Sanitized query string
 */
export function sanitizeSearchQuery(query: string | null | undefined): string {
  if (!query) return "";

  // Remove script tags and dangerous characters
  return query
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

/**
 * Validate URL query parameters to ensure they're safe strings
 * Used by useUrlFilters to validate filter values
 *
 * @param value - Parameter value to validate
 * @param allowedValues - Optional array of allowed values (whitelist)
 * @returns Sanitized parameter value or undefined if invalid
 */
export function sanitizeUrlParam(
  value: string | null | undefined,
  allowedValues?: string[],
): string | undefined {
  if (!value) return undefined;

  const sanitized = sanitizeSearchQuery(value);

  // If whitelist provided, only return if value is in allowed list
  if (allowedValues && allowedValues.length > 0) {
    return allowedValues.includes(sanitized) ? sanitized : undefined;
  }

  return sanitized || undefined;
}
