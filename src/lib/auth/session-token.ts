import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";
import { redis } from "@/db/redis";

/**
 * Short-lived, single-use verification tokens
 *
 * Used to prove that a server-side check really happened before a later request
 * relies on it (currently: WebAuthn passkey verification for sign-in and step-up).
 *
 * How it works:
 * 1. /api/auth/passkey/authenticate/verify verifies the WebAuthn response, generates a
 *    token and stores it in Redis
 * 2. The client passes the token to the sign-in or step-up endpoint
 * 3. That endpoint verifies the token exists and matches, then consumes (deletes) it
 *    to prevent replay attacks
 *
 * Token expiry: 30 seconds (enough for network roundtrip)
 * Storage: Redis (required for multi-instance deployments)
 */

// Token types
export type SessionUpdateTokenType =
  | "passkey-step-up-verify" // Verifies passkey was authenticated for step-up purposes
  | "passkey-sign-in"; // Verifies passkey was authenticated for sign-in

export interface SessionUpdateTokenData {
  type: SessionUpdateTokenType;
  userId: string; // The user who initiated the action
  payload: Record<string, unknown>;
}

const TOKEN_EXPIRY_SECONDS = 30; // 30 seconds

/**
 * Generate a verification token
 * Called by server-side API routes after a successful server-side check
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
 * Verify and consume a verification token
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
