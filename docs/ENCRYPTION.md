# Encryption at Rest

Sensitive data is encrypted with AES-256-GCM and a derived key using scrypt. The same key also signs activity log entries for integrity verification.

## Configuration

- `ENCRYPTION_KEY` (required)
- `ENCRYPTION_KEYS_LEGACY` (optional, comma-separated)

Generate a key:

```bash
openssl rand -hex 32
```

## What is encrypted

- OAuth tokens in `accounts`
- TOTP secrets in `users`
- Settings marked `sensitive: true`
- Activity log signatures (HMAC, not reversible)

## Format

Encrypted values are stored as:

```
salt:iv:authTag:ciphertext
```

All parts are hex-encoded.

## Rotation

1. Set a new `ENCRYPTION_KEY`.
2. Move old key(s) to `ENCRYPTION_KEYS_LEGACY`.
3. Run `npm run db:reencrypt` (supports `--dry-run`).
4. Remove legacy keys once data is re-encrypted.

## Key files

- `src/lib/security.ts`
- `scripts/db/reencrypt.ts`
