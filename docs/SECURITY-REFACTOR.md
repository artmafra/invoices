# Security Hardening Status

This document tracks the major security improvements that are now implemented in the codebase.

## Completed items

- Central policy module (`src/lib/auth/policy.ts`)
- TOTP secret encryption (AES-256-GCM, `docs/ENCRYPTION.md`)
- Session invalidation rules for sensitive changes
- Step-up auth enforcement for critical actions
- Rate limiting on auth and verification endpoints
- Activity log integrity signatures

## Verification

- Run through `docs/AUTH-ARCHITECTURE.md` for flows.
- Use `docs/STEP-UP-AUTH.md` and `docs/RATE-LIMITING.md` to validate enforcement.
- Check cron cleanup (`/api/cron/cleanup`) for retention.
