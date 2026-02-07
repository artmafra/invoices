import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import { redis } from "@/db/redis";

/**
 * Secure session update token management
 *
 * This module provides a secure way to verify that session updates for
 * sensitive operations (impersonation, step-up auth) originated from
 * legitimate server-side API calls, not from malicious client-side code.
 *
 * How it works:
 * 1. When a sensitive API (e.g., /api/admin/users/:id/impersonate) is called,
 *    it generates a short-lived token and stores it in Redis
 * 2. The token is returned to the client along with the session update data
 * 3. When the client calls session.update(), it includes the token
 * 4. The JWT callback verifies the token exists and matches the expected data
 * 5. Token is consumed (deleted) after use to prevent replay attacks
 *
 * Token expiry: 30 seconds (enough for network roundtrip)
 * Storage: Redis (required for multi-instance deployments)
 */

// Token types
export type SessionUpdateTokenType =
  | "impersonate"
  | "end-impersonation"
  | "step-up"
  | "refresh-permissions"
  | "passkey-step-up-verify" // Verifies passkey was authenticated for step-up purposes
  | "passkey-sign-in"; // Verifies passkey was authenticated for NextAuth sign-in

export interface SessionUpdateTokenData {
  type: SessionUpdateTokenType;
  userId: string; // The user who initiated the action
  targetUserId?: string; // For impersonation: the user being impersonated
  payload: Record<string, unknown>; // The actual session update data
}

const TOKEN_EXPIRY_SECONDS = 30; // 30 seconds

/**
 * Generate a secure session update token
 * Called by server-side API routes before returning session update data
 */
export async function generateSessionUpdateToken(data: SessionUpdateTokenData): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const key = `session-update:${token}`;

  try {
    await redis.setex(key, TOKEN_EXPIRY_SECONDS, JSON.stringify(data));
    return token;
  } catch (error) {
    logger.error({ error }, "[Auth] Failed to store session update token");
    throw new Error("Failed to generate session token");
  }
}

/**
 * Verify and consume a session update token
 * Called by the JWT callback when processing session updates
 * Returns the token data if valid, null otherwise
 */
export async function verifyAndConsumeToken(
  token: string,
  expectedType: SessionUpdateTokenType,
  userId: string,
): Promise<SessionUpdateTokenData | null> {
  const key = `session-update:${token}`;

  try {
    // Atomic get and delete (consume token in one operation)
    const raw = await redis.getdel(key);

    if (!raw) {
      logger.warn(
        { tokenPrefix: token.substring(0, 8), expectedType, userId },
        "[Auth] Session update token not found or already consumed",
      );
      return null;
    }

    // ioredis returns strings, manually parse JSON
    const data = JSON.parse(raw) as SessionUpdateTokenData;

    // Verify type matches
    if (data.type !== expectedType) {
      logger.warn(
        { expectedType, actualType: data.type, userId },
        "[Auth] Session update token type mismatch",
      );
      return null;
    }

    // Verify userId matches (the user making the request must be the token owner)
    if (data.userId !== userId) {
      logger.warn(
        { expectedUserId: userId, tokenUserId: data.userId },
        "[Auth] Session update token userId mismatch",
      );
      return null;
    }

    return data;
  } catch (error) {
    logger.error(
      {
        error:
          error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
        tokenPrefix: token.substring(0, 8),
        expectedType,
        userId,
      },
      "[Auth] Failed to verify session update token",
    );
    return null;
  }
}

/**
 * Get current token count (for monitoring/debugging)
 * Note: This queries Redis for keys matching the pattern
 */
export async function getTokenCount(): Promise<number> {
  try {
    const keys = await redis.keys("session-update:*");
    return keys.length;
  } catch (error) {
    logger.error({ error }, "[Auth] Failed to get token count");
    return 0;
  }
}
