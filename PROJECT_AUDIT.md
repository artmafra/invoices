# Backend Security Audit

## Summary
- Authentication flows use layered controls: rate limiting on login and 2FA endpoints, Redis-backed lockout, and short-lived session-update tokens that gate impersonation, step-up, and passkey sign-ins.
- Sensitive profile actions correctly require recent strong auth (password/passkey) and revoke other sessions (e.g., password change, passkey removal, 2FA disable) to contain account takeover.
- Found high-risk gaps around admin-driven impersonation and password resets that allow hijacked admin sessions or stale sessions to persist after credential resets.
- Session tracking and token hashing are generally sound (HMAC-hashed reset/invite codes, revocation checks in JWT callback), but session lifetime and storage hardening need tightening.
- Overall architecture is modular and consistent (centralized error handling, permission checks, DTO/storage layers), and should be preserved.

## Findings
### High
- Impersonation lacks step-up auth/rate limiting: `src/app/api/admin/users/[userId]/impersonate/route.ts` only checks the “system” role before issuing an impersonation token. A stolen admin session can pivot into any non-system account without re-authentication or abuse throttling.
- Admin-initiated password changes don’t invalidate active sessions: In `src/app/api/admin/users/[userId]/route.ts`, setting `validatedData.password` updates the hash but does not revoke existing sessions for that user. A compromised session remains valid after an admin “reset,” leaving the attacker logged in.

### Medium
- Sessions can be long-lived without an absolute cap: `src/lib/auth/callbacks.ts` extends `expiresAt` to `now + 30d` on every activity, and `userSessionService` initializes the same window. There is no maximum lifetime, so a stolen JWT + sessionId can be kept alive indefinitely with periodic traffic.

### Low
- Session tokens stored in plaintext: `src/schema/user-session.schema.ts` keeps `sessionToken` unhashed. While not currently used for auth, a database leak would expose raw tokens that future features might accidentally trust.

## Recommendations
- High (S): Require recent step-up auth and per-IP/user rate limiting before issuing impersonation tokens in `src/app/api/admin/users/[userId]/impersonate/route.ts`; log a security event for start/end to aid detection.
- High (S): When an admin sets a password in `src/app/api/admin/users/[userId]/route.ts`, revoke all existing sessions for the target user (no exception) and queue a security alert email to ensure compromised sessions are killed.
- Medium (M): Introduce an absolute session lifetime (e.g., 30–45 days from issuance) and enforce it in `jwtCallback`/`userSessionService.touchSessionById` so sliding activity cannot extend sessions indefinitely.
- Low (M): Hash `sessionToken` before persisting (or drop it if unused) to reduce blast radius from a database leak; adjust lookups to compare hashes when needed.

## Optional Refactors
- Add a centralized helper that applies both permission checks and step-up enforcement for “privileged admin” actions (impersonation, role/permission edits) to reduce drift between endpoints.
