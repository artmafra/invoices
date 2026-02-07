import { decryptSecret, encryptSecret } from "@/lib/security";

// Token expiry time: 5 minutes
const TOKEN_EXPIRY_MS = 5 * 60 * 1000;

/**
 * Data stored in the pending 2FA token
 */
export interface Pending2faData {
  userId: string;
  email: string;
  availableMethods: {
    email: boolean;
    totp: boolean;
    backup: boolean;
    preferred: string;
    hasAny: boolean;
  };
}

/**
 * Internal structure of the encrypted token payload
 */
interface Pending2faTokenPayload extends Pending2faData {
  exp: number; // Expiry timestamp
  iat: number; // Issued at timestamp
}

/**
 * Create an encrypted pending 2FA token
 *
 * The token contains userId, email, availableMethods, and expiry timestamp,
 * encrypted using AES-256-GCM. This allows stateless 2FA flow without
 * storing pending state in the database.
 *
 * @param data The 2FA data to encode in the token
 * @returns Encrypted token string
 */
export function createPending2faToken(data: Pending2faData): string {
  const now = Date.now();

  const payload: Pending2faTokenPayload = {
    ...data,
    iat: now,
    exp: now + TOKEN_EXPIRY_MS,
  };

  // Encrypt the JSON payload
  const jsonPayload = JSON.stringify(payload);
  return encryptSecret(jsonPayload);
}

/**
 * Verify and decode a pending 2FA token
 *
 * Decrypts the token and validates the expiry timestamp.
 * Returns the original data if valid, throws error if invalid or expired.
 *
 * @param token The encrypted token string
 * @returns Decoded 2FA data
 * @throws Error if token is invalid, expired, or tampered with
 */
export function verifyPending2faToken(token: string): Pending2faData {
  try {
    // Decrypt the token
    const jsonPayload = decryptSecret(token);
    const payload: Pending2faTokenPayload = JSON.parse(jsonPayload);

    // Validate required fields
    if (!payload.userId || !payload.email || !payload.availableMethods) {
      throw new Error("Invalid token payload");
    }

    // Check expiry
    if (Date.now() > payload.exp) {
      throw new Error("Token has expired");
    }

    // Return the data without exp/iat
    return {
      userId: payload.userId,
      email: payload.email,
      availableMethods: payload.availableMethods,
    };
  } catch (error) {
    // Re-throw with generic message to avoid leaking info about token structure
    if (error instanceof Error && error.message === "Token has expired") {
      throw error;
    }
    throw new Error("Invalid or tampered token");
  }
}
