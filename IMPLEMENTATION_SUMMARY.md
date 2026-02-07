# Session Absolute Lifetime Implementation

## Summary

Implemented absolute session lifetime cap to fix security issue where sessions could be extended indefinitely with periodic activity.

## Changes Made

### 1. Environment Variable

- **File**: `env.d.ts`
- Added `SESSION_ABSOLUTE_LIFETIME_DAYS` environment variable
- **File**: `.env.example`
- Added default value of 45 days with documentation

### 2. Schema Update

- **File**: `src/schema/user-session.schema.ts`
- Added `absoluteExpiresAt` timestamp field (NOT NULL)
- New field tracks immutable expiry date set at session creation

### 3. Database Migration

- **File**: `drizzle/0001_add_absolute_expires_at.sql`
- Adds `absolute_expires_at` column with backfill for existing sessions
- Sets existing sessions to `created_at + 45 days`
- Adds index for efficient queries

### 4. Service Layer

- **File**: `src/services/user-session.service.ts`
- Added `ABSOLUTE_SESSION_LIFETIME_MS` constant (configurable via env, default 45 days)
- Sets `absoluteExpiresAt` on session creation = `now + ABSOLUTE_SESSION_LIFETIME_MS`
- Cannot be changed after session creation

### 5. Auth Callbacks

- **File**: `src/lib/auth/callbacks.ts`
- Added validation: rejects sessions where `now > absoluteExpiresAt`
- During session extension: caps `nextExpiresAt` at `absoluteExpiresAt`
- Ensures sliding window cannot push expiry past absolute cap

### 6. Storage Layer

- **File**: `src/storage/user-session.storage.ts`
- Added `isNull` import from drizzle-orm
- Updated `touchById` WHERE clause to check absolute expiry
- Prevents updating sessions past their absolute lifetime

### 7. Demo Seed Script

- **File**: `scripts/db/seed-demo.ts`
- Updated to include `absoluteExpiresAt` when creating demo sessions

## Security Impact

**Before**: Sessions could be kept alive indefinitely by making requests every 5 minutes, extending the expiry by 30 days each time.

**After**: Sessions have a hard cap of 45 days (configurable) from creation. Even with continuous activity, sessions will expire and require re-authentication after this period.

**Attack Mitigation**: Stolen JWT + sessionId can no longer be kept alive forever. Maximum lifetime is now 45 days regardless of activity patterns.

## Configuration

Set in environment variables:

```bash
SESSION_ABSOLUTE_LIFETIME_DAYS=45  # Default if not set
```

## Migration Steps

1. Apply the database migration: `npm run db:push` or run the SQL manually
2. Existing sessions will be backfilled with `absolute_expires_at = created_at + 45 days`
3. No application restart required (environment variable has default value)

## Testing

All TypeScript type checking passes. The implementation:

- ✅ Enforces absolute cap during session extension
- ✅ Validates absolute expiry on every JWT callback
- ✅ Prevents storage layer from updating expired sessions
- ✅ Backfills existing sessions safely
- ✅ Configurable via environment variable
- ✅ Maintains backward compatibility with sliding window behavior
