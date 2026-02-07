# Impersonation

Admins with the system role can impersonate another user for debugging/support.

## Rules

- Only system users can impersonate.
- System users cannot be impersonated.
- Self-impersonation is blocked.

## Endpoints

- `POST /api/admin/users/:userId/impersonate`
- `DELETE /api/admin/users/:userId/impersonate`

Both endpoints return a session update token that must be passed to `session.update()`.

## Key files

- `src/app/api/admin/users/[userId]/impersonate/route.ts`
- `src/lib/auth/session-token.ts`
- `src/hooks/admin/use-users.ts`
