import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

// =============================================================================
// Encryption Configuration
// =============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard IV length
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits for AES-256

/**
 * Get the primary encryption key from environment variable
 * @throws Error if ENCRYPTION_KEY is not set
 */
function getPrimaryKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for encryption. " +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return key;
}

/**
 * Get all encryption keys (primary + legacy) for decryption attempts
 * Returns primary key first, then any legacy keys
 */
function getAllKeys(): string[] {
  const keys: string[] = [];

  // Primary key (required)
  const primaryKey = process.env.ENCRYPTION_KEY;
  if (primaryKey) {
    keys.push(primaryKey);
  }

  // Legacy keys (optional, comma-separated)
  const legacyKeys = process.env.ENCRYPTION_KEYS_LEGACY;
  if (legacyKeys) {
    const parsed = legacyKeys
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    keys.push(...parsed);
  }

  if (keys.length === 0) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is required for encryption. " +
        "Generate one with: openssl rand -hex 32",
    );
  }

  return keys;
}

/**
 * Derive a key from the master key and salt using scrypt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return scryptSync(masterKey, salt, KEY_LENGTH);
}

// =============================================================================
// Encryption Functions
// =============================================================================

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Format: salt:iv:authTag:ciphertext (all hex encoded)
 *
 * Always uses the primary ENCRYPTION_KEY for new encryptions.
 *
 * @param plaintext The string to encrypt
 * @returns Encrypted string in format "salt:iv:authTag:ciphertext"
 * @throws Error if ENCRYPTION_KEY is not set
 */
export function encryptSecret(plaintext: string): string {
  const masterKey = getPrimaryKey();

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);

  // Derive key from master key and salt
  const key = deriveKey(masterKey, salt);

  // Create cipher and encrypt
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Return formatted string: salt:iv:authTag:ciphertext
  return [
    salt.toString("hex"),
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Decrypt a ciphertext string encrypted with encryptSecret
 *
 * Tries the primary key first, then falls back to legacy keys.
 * This enables key rotation: new data uses current key, old data
 * can still be decrypted with previous keys.
 *
 * @param ciphertext The encrypted string in format "salt:iv:authTag:ciphertext"
 * @returns Decrypted plaintext string
 * @throws Error if no key can decrypt the data
 */
export function decryptSecret(ciphertext: string): string {
  const keys = getAllKeys();

  // Parse the ciphertext format
  const parts = ciphertext.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted format");
  }

  const [saltHex, ivHex, authTagHex, encryptedHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  // Try each key until one works
  for (const masterKey of keys) {
    try {
      const key = deriveKey(masterKey, salt);
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString("utf8");
    } catch {
      // Continue to next key
    }
  }

  // No key worked - throw generic error (don't leak which keys were tried)
  throw new Error(
    `Decryption failed. Data may have been encrypted with a different key. ` +
      `Ensure ENCRYPTION_KEY (and ENCRYPTION_KEYS_LEGACY if rotating) are correct.`,
  );
}

/**
 * Check if a string appears to be encrypted (matches our format)
 * Format: salt:iv:authTag:ciphertext (all hex)
 */
export function isEncrypted(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  const parts = value.split(":");
  if (parts.length !== 4) return false;

  // Check if all parts are valid hex strings of expected lengths
  const [salt, iv, authTag, data] = parts;

  // Salt: 16 bytes = 32 hex chars
  // IV: 12 bytes = 24 hex chars
  // AuthTag: 16 bytes = 32 hex chars
  // Data: variable length, but must be valid hex
  const hexRegex = /^[0-9a-f]+$/i;

  return (
    salt.length === SALT_LENGTH * 2 &&
    hexRegex.test(salt) &&
    iv.length === IV_LENGTH * 2 &&
    hexRegex.test(iv) &&
    authTag.length === AUTH_TAG_LENGTH * 2 &&
    hexRegex.test(authTag) &&
    data.length > 0 &&
    data.length % 2 === 0 &&
    hexRegex.test(data)
  );
}

/**
 * Check if encrypted data was encrypted with the current primary key
 * Returns true if data decrypts with primary key, false if it requires a legacy key
 *
 * Useful for identifying data that needs re-encryption during key rotation.
 */
export function isEncryptedWithCurrentKey(ciphertext: string): boolean {
  if (!isEncrypted(ciphertext)) return false;

  const primaryKey = process.env.ENCRYPTION_KEY;
  if (!primaryKey) return false;

  const parts = ciphertext.split(":");
  const [saltHex, ivHex, authTagHex, encryptedHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  try {
    const key = deriveKey(primaryKey, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    decipher.update(encrypted);
    decipher.final();
    return true;
  } catch {
    return false;
  }
}

/**
 * Re-encrypt a value with the current primary key
 * Decrypts using any available key, then encrypts with primary key
 *
 * @param ciphertext The encrypted value to re-encrypt
 * @returns Newly encrypted value using current primary key
 */
export function reencryptSecret(ciphertext: string): string {
  const plaintext = decryptSecret(ciphertext);
  return encryptSecret(plaintext);
}

// =============================================================================
// Token Generation Functions
// =============================================================================

/**
 * Generate a secure numeric code (OTP)
 * @param digits Number of digits (default: 6)
 * @returns A string of random digits
 */
export function generateSecureCode(digits = 6): string {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  const range = max - min + 1;

  const randomBuffer = randomBytes(4);
  const randomNumber = randomBuffer.readUInt32BE(0);

  return (min + (randomNumber % range)).toString();
}

/**
 * Generate a secure random token
 * @param length Length of the token (default: 32)
 * @returns A random alphanumeric string
 */
export function generateSecureToken(length = 32): string {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}

// =============================================================================
// Verification Token Hashing (non-reversible)
// =============================================================================

export type VerificationTokenPurpose =
  | "password_reset"
  | "invite"
  | "email_change"
  | "email_verification"
  | "two_factor_email";

/**
 * Hash a verification token/code using HMAC-SHA256 with ENCRYPTION_KEY.
 *
 * This is intentionally non-reversible and is meant for tokens that only need
 * verification (not recovery). Use `scope` when you want to bind a token/code
 * to a particular principal (e.g. userId) while still keeping only a single
 * stored hash.
 */
export function hashVerificationToken(
  purpose: VerificationTokenPurpose,
  token: string,
  scope?: string,
): string {
  const key = getPrimaryKey();

  // Domain separation prevents accidental cross-purpose token reuse.
  // Scope is optional and should be stable (e.g. userId).
  const payload = scope ? `${purpose}:${scope}:${token}` : `${purpose}:${token}`;

  return createHmac("sha256", key).update(payload, "utf8").digest("hex");
}

// =============================================================================
// Activity Log Integrity Functions (HMAC Signing)
// =============================================================================

/**
 * Compute SHA-256 hash of content
 * Used for content hashing in activity log chain
 *
 * @param content String content to hash
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export function computeContentHash(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Sign content using HMAC-SHA256 with the primary ENCRYPTION_KEY.
 * Used for activity log integrity protection.
 *
 * The same key is used for both encryption and signing because:
 * - ENCRYPTION_KEY is already securely managed with rotation support
 * - HMAC and AES use keys differently (HMAC doesn't derive keys)
 * - Simplifies key management without reducing security
 *
 * @param content String content to sign
 * @returns Hex-encoded HMAC-SHA256 signature (64 characters)
 */
export function signActivityLog(content: string): string {
  const key = getPrimaryKey();
  return createHmac("sha256", key).update(content, "utf8").digest("hex");
}

/**
 * Verify an HMAC signature against content.
 * Tries the primary key first, then falls back to legacy keys.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param content Original content that was signed
 * @param signature Hex-encoded signature to verify
 * @returns True if signature is valid, false otherwise
 */
export function verifyActivitySignature(content: string, signature: string): boolean {
  const keys = getAllKeys();

  for (const key of keys) {
    try {
      const expectedSignature = createHmac("sha256", key).update(content, "utf8").digest("hex");

      // Use timing-safe comparison to prevent timing attacks
      const sigBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expectedSignature, "hex");

      if (
        sigBuffer.length === expectedBuffer.length &&
        timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        return true;
      }
    } catch {
      // Continue to next key
    }
  }

  return false;
}

/**
 * Check if a signature was created with the current (primary) ENCRYPTION_KEY.
 * Used during key rotation to identify signatures that need re-signing.
 *
 * @param content Original content that was signed
 * @param signature Hex-encoded signature to check
 * @returns True if signature matches the current key, false otherwise
 */
export function isSignedWithCurrentKey(content: string, signature: string): boolean {
  try {
    const key = getPrimaryKey();
    const expectedSignature = createHmac("sha256", key).update(content, "utf8").digest("hex");

    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    return sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Genesis hash constant for the first entry in the activity log chain.
 * This is a well-known value that marks the start of the chain.
 */
export const GENESIS_HASH = "genesis".padEnd(64, "0");
