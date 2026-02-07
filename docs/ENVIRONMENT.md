# Environment Variables

Central reference for all environment variables used by the app. Copy `.process.env.example` to `.env`, then fill the required values for your environment.

## Type Safety and Validation

This project uses a two-layer approach:

1. **`process.env.d.ts`** - TypeScript types for `process.env` autocomplete
2. **`src/lib/process.env.ts`** - Runtime validation with Zod

**Recommended:** Import `env` from `@/lib/env` instead of using `process.env`:

```typescript


const url = process.env.DATABASE_URL;        // ✅ string (validated)
const port = process.env.PORT;                // ✅ number (auto-coerced)
const cache = process.env.ENABLE_VERSION_CACHE; // ✅ boolean (auto-coerced)
```

Benefits:
- ✅ Validates on startup (fails fast with clear errors)
- ✅ Type coercion (strings → numbers, booleans)
- ✅ Default values
- ✅ Required vs optional enforcement

## Core

- `NEXT_PUBLIC_APP_URL` - Public base URL (required in prod, defaults to localhost in dev)
- `PORT` - Server port (default: 3000)
- `DATABASE_URL` - PostgreSQL connection string (required)
- `DATABASE_POOL_SIZE` - Max connections per instance (optional, default: 5, see `/docs/DATABASE-POOLING.md`)
- `DATABASE_IDLE_TIMEOUT` - Close idle connections after N seconds (optional, default: 20)
- `DATABASE_CONNECT_TIMEOUT` - Connection attempt timeout in seconds (optional, default: 10)
- `AUTH_URL` - Auth.js base URL (required in prod)
- `AUTH_SECRET` - Auth.js signing secret (required)
- `AUTH_TRUST_HOST` - Set `true` behind a reverse proxy (Vercel, Nginx, etc.)
- `ENCRYPTION_KEY` - Encryption key for sensitive data (required)
- `ENCRYPTION_KEYS_LEGACY` - Comma-separated legacy keys for rotation (optional)
- `LOG_LEVEL` - `trace|debug|info|warn|error|fatal` (optional)

**Database Connection Pooling:** See `/docs/DATABASE-POOLING.md` for comprehensive guide on preventing connection exhaustion in production. Recommended pool sizes: 3-5 for serverless (Vercel/Netlify), 5-10 for containers (Railway/Render), 10-20 for dedicated servers.

## Identity and auth

- `NEXT_PUBLIC_AUTH_GOOGLE_CLIENT_ID`, `AUTH_GOOGLE_SECRET` - Google OAuth (optional)
- `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGINS` - Passkeys/WebAuthn config (optional)

## Email (Gmail API)

- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_FROM_EMAIL`
- Required for password resets, invitations, verification codes, and security alerts.

## Storage (Google Cloud Storage)

- `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_STORAGE_BUCKET`, `GOOGLE_CLOUD_CREDENTIALS`
- Required for uploads and avatar management.

## Rate limiting and Redis

- `REDIS_URL` - Redis connection URL (redis:// or rediss:// protocol)
- **Required in all environments** for rate limiting, login protection, session tokens, version caching, and background jobs.
- These are core security features, not optional enhancements.

## Queue / background jobs

- `QUEUE_CONCURRENCY` - Worker concurrency (default: 5)
- Uses same `REDIS_URL` as rate limiting for BullMQ queues.

## Cron and maintenance

- `CRON_SECRET` - Bearer token for `/api/cron/cleanup`

## Development and testing

- `TEST_DEFAULT_PASSWORD` - Used by `npm run db:reset` for local test users

## Validation helpers

- `npm run db:check` - Verify `DATABASE_URL`
- `npm run test:email -- --to you@example.com` - Verify Gmail configuration
- `npm run test:storage` - Verify Cloud Storage configuration
- `npm run test:rate-limit` - Verify Redis rate limiting configuration
