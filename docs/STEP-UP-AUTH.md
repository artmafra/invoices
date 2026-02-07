# Step-Up Authentication

Step-up auth requires a recent re-authentication for sensitive actions.

## How it works

- Session includes `lastAuthAt` and `stepUpAuthAt` timestamps.
- `requireStepUpAuth()` enforces a grace window (10 minutes).
- Sensitive actions call `requireStepUpAuth` server-side.

## API endpoint

- `POST /api/auth/step-up` issues a step-up session update token.

## Client usage

Use the `useStepUpAuth` hook, which provides:

- `requiresStepUp` — Check if step-up is required
- `isVerified` — Check if user recently verified
- `withStepUp(fn)` — Wrapper that triggers verification dialog if needed
- `handleStepUpSuccess` — Handle successful verification with token forwarding

When APIs return `STEP_UP_REQUIRED` errors, use the `withStepUp` wrapper to automatically trigger the verification dialog.

## Server usage

```ts
import { requireStepUpAuth } from "@/lib/step-up-auth";

requireStepUpAuth(session);
```

## Methods

- Password (credentials)
- Passkey (WebAuthn)

## Key files

- `src/lib/step-up-auth.ts`
- `src/lib/auth/policy.ts`
- `src/app/api/auth/step-up/route.ts`
- `src/hooks/public/use-step-up-auth.ts`
