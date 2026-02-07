# Auth Architecture

Authentication is implemented with Auth.js (next-auth v5) using custom providers and session hardening.

## Providers

- Credentials (email/password)
- Google OAuth
- Two-factor provider (email/TOTP/backup codes)
- Passkey provider (WebAuthn)

## Security highlights

- Step-up auth for sensitive actions (10-minute window).
- Rate limiting on auth and verification endpoints.
- Account lockout after repeated failures (Redis-backed).
- Session invalidation rules in `src/lib/auth/policy.ts`.

## Session model

- Auth.js session + custom fields (permissions, step-up timestamps).
- Session update tokens gate sensitive session changes.
- **Tokens stored in Redis** (multi-instance safe, 30-second TTL).

### Session update tokens

Secure session updates for sensitive operations (impersonation, step-up auth) use short-lived tokens:

1. Server API generates token and stores in Redis (30s TTL)
2. Client receives token with session update data
3. Client calls `session.update()` with token
4. JWT callback verifies token exists and matches
5. Token consumed (deleted) to prevent replay

**Token types:**

- `impersonate` - Start impersonating another user
- `end-impersonation` - Stop impersonation
- `step-up` - Elevate auth privileges
- `refresh-permissions` - Update user permissions
- `passkey-step-up-verify` - Verify passkey for step-up

**Redis requirement:** Required in all environments. Missing Redis causes session tokens to fail generation/verification.

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

- `src/lib/auth/index.ts`
- `src/lib/auth/providers.ts`
- `src/lib/auth/callbacks.ts`
- `src/lib/auth/session-token.ts`
- `src/services/login-protection.service.ts`
