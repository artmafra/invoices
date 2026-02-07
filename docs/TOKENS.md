# Token System

Unified token storage and validation for verification flows (password reset, invites, email change, email verification, 2FA email codes).

## Overview

- All tokens are stored in the `tokens` table with hashed values, expiry, and usedAt.
- Business-specific metadata lives in linked tables (invites, email change requests).
- Scoped tokens include the userId in the hash to prevent cross-user reuse.

## Token types

| Type                 | Format        | Expiry     | Scoped       | Metadata table          |
| -------------------- | ------------- | ---------- | ------------ | ----------------------- |
| `password_reset`     | 64-char token | 1 hour     | No           | None                    |
| `user_invite`        | 64-char token | 7 days     | No           | `user_invites`          |
| `email_change`       | 6-digit code  | 10 minutes | Yes (userId) | `email_change_requests` |
| `email_verification` | 6-digit code  | 10 minutes | Yes (userId) | None                    |
| `two_factor_email`   | 6-digit code  | 10 minutes | Yes (userId) | None                    |

## Key files

| File                                         | Purpose                       |
| -------------------------------------------- | ----------------------------- |
| `src/schema/tokens.schema.ts`                | Token table and enum types    |
| `src/schema/user-invites.schema.ts`          | Invite metadata               |
| `src/schema/email-change-requests.schema.ts` | Email change metadata         |
| `src/storage/token.storage.ts`               | Hashing, lookup, CRUD         |
| `src/services/token.service.ts`              | Token creation and validation |

## Usage

### Creating tokens

```ts
import { tokenService } from "@/services/runtime/token";

const { rawToken } = await tokenService.createPasswordResetToken(userId);
const { rawToken: inviteToken } = await tokenService.createUserInvite(email, invitedBy, roleId);
const { rawCode: emailChangeCode } = await tokenService.createEmailChangeToken(userId, newEmail);
const { rawCode: emailVerifyCode } = await tokenService.createEmailVerificationToken(
  userId,
  userEmailId,
);
const { rawCode: twoFactorCode } = await tokenService.createTwoFactorToken(userId);
```

### Validating tokens

```ts
const reset = await tokenService.validatePasswordResetToken(rawToken);
const invite = await tokenService.validateInviteToken(rawToken);
const change = await tokenService.validateEmailChangeCode(userId, code);
const verify = await tokenService.validateEmailVerificationCode(userId, userEmailId, code);
const twoFactor = await tokenService.validateTwoFactorCode(userId, code);
```

### Marking as used

```ts
await tokenService.markPasswordResetUsed(tokenId);
await tokenService.markInviteAccepted(tokenId);
await tokenService.markEmailChangeUsed(tokenId);
await tokenService.markEmailVerificationUsed(tokenId);
await tokenService.markTwoFactorUsed(tokenId);
```

## Adding a new token type

1. Add the enum value in `src/schema/tokens.schema.ts`.
2. Update `TokenStorage.getHashPurpose()` in `src/storage/token.storage.ts`.
3. Add expiry + generator in `src/services/token.service.ts`.
4. Add a metadata table only if you need extra fields beyond userId.
5. Run migrations: `npm run db:generate && npm run db:push`.

## Why passkey challenges are separate

Passkey challenges are stored in `passkey_challenges` and are not part of the token system because:

- The raw challenge must be stored for WebAuthn verification.
- Authentication challenges do not always have a userId yet.
- Challenges are deleted on verification instead of being marked used.

## Cleanup

```ts
await tokenService.cleanupExpiredTokens();
await tokenService.cleanupExpiredTokensByType("two_factor_email");
```
