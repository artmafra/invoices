# Auth Architecture

Authentication is implemented with [Better Auth](https://www.better-auth.com). Better Auth owns the session (cookie + `user_sessions` row) and the Google OAuth flow; credential checks, 2FA, passkeys, lockout and login history stay in the existing services and are exposed through a small custom plugin.

## Sign-in methods

- Email/password: `POST /api/auth/sign-in/credentials` (returns a pending 2FA challenge when needed)
- Two-factor (email/TOTP/backup code): `POST /api/auth/sign-in/two-factor` (requires the pending 2FA token from the previous step)
- Passkey (WebAuthn): `POST /api/auth/sign-in/passkey` (requires the verification token from `/api/auth/passkey/authenticate/verify`)
- Google OAuth: Better Auth social provider; sign-up and implicit account linking are disabled, only accounts linked from the profile page can sign in

Client helpers live in `src/lib/auth-client.ts`.

## Security highlights

- Step-up auth for sensitive actions (10-minute window), stored on the session row.
- Rate limiting on auth and verification endpoints.
- Account lockout after repeated failures (Redis-backed).
- Unused Better Auth endpoints (update-user, change-password, link/unlink account, ...) are disabled via `disabledPaths`.
- Session invalidation rules in `src/lib/auth/policy.ts`.

## Session model

- The cookie holds an opaque token; the session is a row in `user_sessions` (see `docs/SESSIONS.md`).
- `auth()` (server) and `GET /api/auth/get-session` (client) return the app session built by the `customSession` plugin in `src/lib/auth/session-builder.ts`: `{ user: { id, role, permissions, apps, impersonatedBy, stepUpAuthAt, ... }, sessionId, expires }`.
- Role, permissions and apps are read from the database on every session read, so changes apply without re-login. The session is rejected when the user is deactivated or the absolute lifetime is exceeded.
- The client reads the session through `useSessionContext()`; `update()` refetches it.
- Impersonation (`impersonated_user_id`) and step-up (`step_up_auth_at`) are columns on the session row, written by their API routes.

### Verification tokens

Short-lived single-use tokens in Redis (30s TTL, `src/lib/auth/session-token.ts`) prove that a passkey was verified server-side before sign-in or step-up:

- `passkey-sign-in`
- `passkey-step-up-verify`

**Redis requirement:** Required in all environments.

### Login protection

Redis-backed account lockout after repeated failures:

- Tracks failed login attempts per email
- Locks account after threshold exceeded
- Prevents brute force attacks
- Works across multi-instance deployments

**Service:** `src/services/login-protection.service.ts`

## Redirect patterns

### Server-side redirects (security boundary)

**Purpose:** Enforce authentication requirements before page renders.

**Locations:**

- `src/proxy.ts`: Middleware-level redirects for unauthenticated requests
- `src/app/admin/(protected)/layout.tsx`: Layout-level session checks
- Individual page components: Pre-checks before rendering sensitive content

**When to use:**

- Initial page load authentication
- Permission-based access control
- Session expiry enforcement

**Example:**

```tsx
// src/app/admin/(protected)/system/users/page.tsx
export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || new Date(session.expires) < new Date()) {
    redirect("/admin/login"); // Server-side redirect
  }
  return <UsersPageContent />;
}
```

### Client-side redirects (UX enhancement)

**Purpose:** Detect session invalidation during active use and provide immediate feedback.

**Locations:**

- `src/hooks/use-session.ts`: `useRequireSession()` hook

**When to use:**

- Session invalidation detection (admin revokes session)
- Real-time auth state changes (session expires while user is active)
- Progressive enhancement for better UX

**Example:**

```tsx
// src/hooks/use-session.ts
export function useRequireSession() {
  const { authenticated, loading } = useUserSession();

  useEffect(() => {
    if (!loading && !authenticated) {
      window.location.href = "/admin/login"; // Client-side redirect (UX only)
    }
  }, [loading, authenticated]);

  // ...
}
```

**Security note:** Client-side redirects are **UX-only** and can be bypassed by browser extensions or disabled JavaScript. All security enforcement happens server-side through:

1. Middleware checks (`proxy.ts`)
2. Layout guards (`(protected)/layout.tsx`)
3. API route authentication (`requirePermission()`)

## Key files

- `src/lib/auth/index.ts` (Better Auth instance, `auth()`)
- `src/lib/auth/sign-in-plugin.ts` (credentials, 2FA, passkey endpoints)
- `src/lib/auth/database-hooks.ts` (session enrichment, login history, Google policy)
- `src/lib/auth/session-builder.ts` (app session)
- `src/lib/auth/session-token.ts`
- `src/lib/auth-client.ts`
- `src/services/login-protection.service.ts`
