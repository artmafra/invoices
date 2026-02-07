import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Default cache control header for authenticated/private data.
 * - private: Response is user-specific, not cacheable by shared caches
 * - max-age=0: Browser should revalidate on every request
 * - must-revalidate: Stale responses must not be used without revalidation
 */
const DEFAULT_CACHE_CONTROL = "private, max-age=0, must-revalidate";

/**
 * Generate a weak ETag from a seed string.
 * Weak ETags (W/"...") indicate semantic equivalence rather than byte-for-byte identity.
 *
 * @param seed - A version string (e.g., timestamp + count + query params)
 * @returns Weak ETag string in format W/"hash"
 */
export function generateWeakETag(seed: string): string {
  const hash = createHash("sha1").update(seed).digest("hex").slice(0, 16);
  return `W/"${hash}"`;
}

/**
 * Check if the request's If-None-Match header matches the given ETag.
 *
 * @param request - The incoming request
 * @param etag - The current ETag value
 * @returns true if the client's cached version matches (304 should be returned)
 */
export function isETagMatch(request: NextRequest, etag: string): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (!ifNoneMatch) return false;

  // Handle multiple ETags in If-None-Match (comma-separated)
  const clientETags = ifNoneMatch.split(",").map((tag) => tag.trim());
  return clientETags.includes(etag);
}

/**
 * Options for conditional request handling.
 */
export interface ConditionalRequestOptions {
  /** Custom Cache-Control header value */
  cacheControl?: string;
}

/**
 * Result of a conditional request check.
 * Either a 304 response (cached) or null (proceed to fetch data).
 */
export type ConditionalCheckResult = NextResponse | null;

/**
 * Check if a 304 Not Modified response should be returned.
 * Use this when you want to check the ETag before fetching data.
 *
 * @param request - The incoming request
 * @param versionSeed - A stable version string derived from cheap DB signals
 * @param options - Optional configuration
 * @returns 304 response if ETag matches, null otherwise
 */
export function checkConditionalRequest(
  request: NextRequest,
  versionSeed: string,
  options: ConditionalRequestOptions = {},
): ConditionalCheckResult {
  const etag = generateWeakETag(versionSeed);

  if (isETagMatch(request, etag)) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": options.cacheControl ?? DEFAULT_CACHE_CONTROL,
      },
    });
  }

  return null;
}

/**
 * Create a JSON response with ETag and Cache-Control headers.
 *
 * @param data - The response data to serialize as JSON
 * @param versionSeed - A stable version string for ETag generation
 * @param options - Optional configuration
 * @returns NextResponse with proper caching headers
 */
export function jsonResponseWithETag<T>(
  data: T,
  versionSeed: string,
  options: ConditionalRequestOptions = {},
): NextResponse<T> {
  const etag = generateWeakETag(versionSeed);

  return NextResponse.json(data, {
    headers: {
      ETag: etag,
      "Cache-Control": options.cacheControl ?? DEFAULT_CACHE_CONTROL,
    },
  });
}

/**
 * Handle a conditional GET request with ETag support.
 * This is the main entry point for routes that want ETag handling.
 *
 * Flow:
 * 1. Get version seed from getVersionSeed()
 * 2. If If-None-Match matches, return 304 (no data fetch)
 * 3. Otherwise, call getData() and return 200 with ETag
 *
 * @param request - The incoming request
 * @param getVersionSeed - Function that returns a cheap version string (e.g., max(updated_at) + count)
 * @param getData - Function that fetches the full response data
 * @param options - Optional configuration
 * @returns Either a 304 response or 200 with data and ETag
 *
 * @example
 * ```ts
 * return handleConditionalRequest(
 *   request,
 *   async () => {
 *     const version = await userService.getUsersVersion(filters);
 *     return `${version.maxUpdatedAt}-${version.count}-${JSON.stringify(sortedParams)}`;
 *   },
 *   async () => {
 *     const result = await userService.getUsersPaginated(filters, options);
 *     return { users: result.data, total: result.total };
 *   }
 * );
 * ```
 */
export async function handleConditionalRequest<T>(
  request: NextRequest,
  getVersionSeed: () => Promise<string> | string,
  getData: () => Promise<T>,
  options: ConditionalRequestOptions = {},
): Promise<NextResponse<T | null>> {
  // Get version seed first (cheap operation)
  const versionSeed = await getVersionSeed();

  // Check if client has valid cached version
  const notModifiedResponse = checkConditionalRequest(request, versionSeed, options);
  if (notModifiedResponse) {
    return notModifiedResponse as NextResponse<T | null>;
  }

  // Fetch full data and return with ETag
  const data = await getData();
  return jsonResponseWithETag(data, versionSeed, options);
}

/**
 * Build a version seed string from query parameters.
 * Sorts parameters alphabetically for consistent hashing.
 *
 * @param params - Object containing query parameters
 * @returns Deterministic string representation of params
 */
export function buildQueryParamsSeed(params: Record<string, unknown>): string {
  // Filter out undefined/null values and sort keys for consistency
  const filtered = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify(filtered);
}
