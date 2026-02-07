import { NextResponse } from "next/server";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { logger } from "@/lib/logger";
import { redis } from "@/db/redis";

// Export redis client for use in other services (e.g., login protection)
export { redis };

/**
 * Rate limiter configurations for different use cases
 * Using rate-limiter-flexible with sliding window algorithm
 */
export const rateLimiters = {
  /**
   * Auth endpoints - strict limits to prevent brute force
   * 5 requests per minute per identifier (IP + email combo)
   */
  auth: new RateLimiterRedis({
    storeClient: redis,
    points: 5, // Number of requests
    duration: 60, // Per 60 seconds
    keyPrefix: "ratelimit:auth",
    blockDuration: 0, // Don't block, just return consumed status
  }),

  /**
   * NextAuth signin endpoint - direct protection for NextAuth credentials callback
   * Same limits as auth to prevent bypassing verify-credentials rate limiting
   * 5 requests per minute per identifier (IP + email combo)
   */
  nextAuthSignin: new RateLimiterRedis({
    storeClient: redis,
    points: 5,
    duration: 60,
    keyPrefix: "ratelimit:nextauth-signin",
    blockDuration: 0,
  }),

  /**
   * Password reset - moderate limits
   * 3 requests per minute per IP
   */
  passwordReset: new RateLimiterRedis({
    storeClient: redis,
    points: 3,
    duration: 60,
    keyPrefix: "ratelimit:password-reset",
    blockDuration: 0,
  }),

  /**
   * 2FA code resend - strict to prevent spam
   * 3 requests per 30 seconds per user
   */
  twoFactorResend: new RateLimiterRedis({
    storeClient: redis,
    points: 3,
    duration: 30,
    keyPrefix: "ratelimit:2fa-resend",
    blockDuration: 0,
  }),

  /**
   * 2FA code verification - prevent brute force
   * 5 attempts per minute per user
   */
  twoFactorVerify: new RateLimiterRedis({
    storeClient: redis,
    points: 5,
    duration: 60,
    keyPrefix: "ratelimit:2fa-verify",
    blockDuration: 0,
  }),

  /**
   * Token validation (invite/reset) - moderate limits
   * 10 requests per minute per IP
   */
  tokenValidation: new RateLimiterRedis({
    storeClient: redis,
    points: 10,
    duration: 60,
    keyPrefix: "ratelimit:token-validation",
    blockDuration: 0,
  }),

  /**
   * Admin invite issuance - moderate limits
   * 10 requests per minute per user (authenticated)
   */
  adminInvite: new RateLimiterRedis({
    storeClient: redis,
    points: 10,
    duration: 60,
    keyPrefix: "ratelimit:admin-invite",
    blockDuration: 0,
  }),

  /**
   * Step-up authentication - prevent brute force on re-auth
   * 5 attempts per minute per user
   */
  stepUpAuth: new RateLimiterRedis({
    storeClient: redis,
    points: 5,
    duration: 60,
    keyPrefix: "ratelimit:step-up-auth",
    blockDuration: 0,
  }),

  /**
   * Sensitive profile actions - moderate limits for security-critical operations
   * 10 requests per minute per IP (password change, session revoke, etc.)
   */
  sensitiveAction: new RateLimiterRedis({
    storeClient: redis,
    points: 10,
    duration: 60,
    keyPrefix: "ratelimit:sensitive-action",
    blockDuration: 0,
  }),

  /**
   * Default rate limiter for general API endpoints
   * 60 requests per minute per IP
   */
  default: new RateLimiterRedis({
    storeClient: redis,
    points: 60,
    duration: 60,
    keyPrefix: "ratelimit:default",
    blockDuration: 0,
  }),
};

export type RateLimiterType = keyof typeof rateLimiters;

/**
 * Extract IP address from request headers
 */
export function getClientIp(request: Request): string {
  // Check common headers for proxied requests
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  // Cloudflare
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  // Vercel
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  // Fallback - in dev environment this will be localhost
  return "127.0.0.1";
}

/**
 * Rate limit result with helper methods
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  /**
   * Distinguishes a real limit from dependency unavailability.
   * - limited: the limiter ran and rejected the request
   * - unavailable: Redis/rate limiter is not configured or is unreachable
   */
  kind?: "limited" | "unavailable";
}

/**
 * Check rate limit for a given identifier
 * Throws if limiter type is invalid (programming error)
 */
export async function checkRateLimit(
  limiterType: RateLimiterType,
  identifier: string,
): Promise<RateLimitResult> {
  const limiter = rateLimiters[limiterType];

  if (!limiter) {
    throw new Error(`[Rate Limit] Invalid limiter type "${limiterType}".`);
  }

  try {
    const result = await limiter.consume(identifier, 1);

    return {
      success: result.remainingPoints > 0,
      limit: limiter.points,
      remaining: Math.max(0, result.remainingPoints - 1),
      reset: Date.now() + result.msBeforeNext,
    };
  } catch (error: any) {
    // rate-limiter-flexible throws RateLimiterRes when limit is exceeded
    if (error.remainingPoints !== undefined) {
      return {
        success: false,
        limit: limiter.points,
        remaining: 0,
        reset: Date.now() + error.msBeforeNext,
        kind: "limited",
      };
    }

    logger.error({ error, limiterType, identifier }, "[Rate Limit] Redis error");

    // Fail closed (deny request) to prevent brute-force during Redis outages
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000, // Retry after 1 minute
      kind: "unavailable",
    };
  }
}

/**
 * Create a 429 Too Many Requests response with proper headers
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Too many requests. Please try again later.",
      retryAfter,
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
        "Retry-After": Math.max(retryAfter, 1).toString(),
      },
    },
  );
}

/**
 * Create a 503 Service Unavailable response when rate limiting cannot be enforced.
 * Used to fail closed in production without crashing the whole app.
 */
export function rateLimitUnavailableResponse(
  result?: Pick<RateLimitResult, "reset">,
): NextResponse {
  const reset = result?.reset ?? Date.now() + 60000;
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);

  return NextResponse.json(
    {
      error: "Service temporarily unavailable. Please try again later.",
      retryAfter,
    },
    {
      status: 503,
      headers: {
        "Retry-After": Math.max(retryAfter, 1).toString(),
      },
    },
  );
}

/**
 * Combined helper: check rate limit and return response if limited
 * Returns NextResponse if rate limited, null if allowed
 */
export async function withRateLimit(
  limiterType: RateLimiterType,
  identifier: string,
): Promise<NextResponse | null> {
  const result = await checkRateLimit(limiterType, identifier);

  // Rate limited
  if (!result.success) {
    if (result.kind === "unavailable") {
      return rateLimitUnavailableResponse(result);
    }
    return rateLimitResponse(result);
  }

  // Allowed
  return null;
}

/**
 * Add artificial delay to prevent timing-based user enumeration
 * Should be used when response might reveal user existence via timing
 */
export async function constantTimeDelay(minMs: number = 100, maxMs: number = 200): Promise<void> {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise((resolve) => setTimeout(resolve, delay));
}
