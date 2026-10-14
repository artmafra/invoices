# Impersonation

Admins with the system role can impersonate another user for debugging/support.

## Rules

- Only system users can impersonate.
- System users cannot be impersonated.
- Self-impersonation is blocked.

## Endpoints

- `POST /api/admin/users/:userId/impersonate`
- `DELETE /api/admin/users/:userId/impersonate`

Both endpoints store/clear `impersonated_user_id` on the current session row; the client then refetches the session (`useSessionContext().update()`). The session resolves to the target user, with `impersonatedBy` set to the admin.

## Key files

- `src/app/api/admin/users/[userId]/impersonate/route.ts`
- `src/lib/auth/session-builder.ts`
- `src/hooks/admin/use-users.ts`
