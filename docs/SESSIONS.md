# Sessions

Sessions are Better Auth sessions stored in the `user_sessions` table, which also holds device info, geolocation, revocation state and step-up/impersonation context.

## Overview

- The session cookie holds an opaque token that maps to a row in `user_sessions` (no JWT).
- Every login (password, 2FA, passkey, Google) creates a row with IP/device metadata via `databaseHooks.session.create` in `src/lib/auth/database-hooks.ts`.
- Sliding expiry (30 days) with an absolute lifetime cap (`SESSION_ABSOLUTE_LIFETIME_DAYS`, default 45) is applied in `src/lib/auth/session-builder.ts`.
- Revoking a session sets `is_revoked` and expires it, so it is rejected on the next request.
- Admins can list and revoke sessions.

## API endpoints

- `GET/DELETE /api/profile/sessions` (current user)
- `GET/DELETE /api/admin/sessions` (admin)

## Key files

- `src/schema/user-session.schema.ts`
- `src/storage/user-session.storage.ts`
- `src/services/user-session.service.ts`
- `src/lib/auth/session-builder.ts`
- `src/app/api/profile/sessions/route.ts`
- `src/app/api/admin/sessions/route.ts`

## Security notes

- Session revocation is enforced server-side on every request.
- Sensitive actions may revoke other sessions (see `docs/STEP-UP-AUTH.md`).
