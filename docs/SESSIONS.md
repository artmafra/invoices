# Sessions

Session tracking combines Auth.js sessions with a database session table to support device info, revocation, and admin visibility.

## Overview

- Sessions are stored in the `sessions` table.
- Each login writes a session record with IP/device metadata.
- Admins can list and revoke sessions.

## API endpoints

- `GET/POST/DELETE /api/profile/sessions` (current user)
- `GET/DELETE /api/admin/sessions` (admin)

## Key files

- `src/schema/sessions.schema.ts`
- `src/storage/session.storage.ts`
- `src/services/user-session.service.ts`
- `src/app/api/profile/sessions/route.ts`
- `src/app/api/admin/sessions/route.ts`

## Security notes

- Session revocation is enforced server-side on every request.
- Sensitive actions may revoke other sessions (see `docs/STEP-UP-AUTH.md`).
