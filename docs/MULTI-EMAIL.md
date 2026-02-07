# Multi-Email System

Users can manage multiple email addresses on a single account. One email is marked as primary; any verified email can be used to sign in.

## Data model

`user_emails` columns:

- `id` (uuid)
- `user_id` (uuid, FK -> users.id)
- `email` (unique)
- `is_primary` (boolean)
- `verified_at` (timestamp, nullable)
- `created_at` (timestamp)

Constraints:

- Each email address is globally unique.
- Each user must have exactly one primary email.
- The primary email is synced to `users.email` for compatibility.

## Flow summary

1. Add email (step-up required) -> create unverified record.
2. Send verification code (email_verification token).
3. Verify code -> mark verified.
4. Optional: set as primary (step-up required, revokes other sessions).

## API endpoints

- `GET /api/profile/emails` - List current user emails.
- `POST /api/profile/emails` - Add email (step-up required).
- `GET /api/profile/emails/:id` - Fetch one email.
- `DELETE /api/profile/emails/:id` - Remove email (step-up required).
- `POST /api/profile/emails/:id/verify` - Send or resend verification code.
- `PUT /api/profile/emails/:id/verify` - Verify email with a code.
- `PATCH /api/profile/emails/:id/primary` - Set primary email (step-up required).

## Rate limiting

- List/get: `default`
- Add / remove / set primary: `sensitiveAction`
- Send verification code: `twoFactorResend`
- Verify code: `twoFactorVerify`

See `docs/RATE-LIMITING.md` for configuration.

## Token system

Verification codes use the unified token system:

- Type: `email_verification`
- Format: 6-digit code
- Expiry: 10 minutes
- Hash scope: userId

`userEmailId` is validated in the service layer; the hash itself is scoped to userId only.

## Security actions

- Primary email change revokes all other sessions (keeps current session).
- A security alert is sent to the old primary email.

## Key files

| Area    | Path                                                   |
| ------- | ------------------------------------------------------ |
| Schema  | `src/schema/user-emails.schema.ts`                     |
| Storage | `src/storage/user-email.storage.ts`                    |
| Service | `src/services/user-email.service.ts`                   |
| API     | `src/app/api/profile/emails`                           |
| Hooks   | `src/hooks/public/use-user-emails.ts`                  |
| UI      | `src/components/admin/profile/email-manage-dialog.tsx` |

## Error codes

Common codes returned by these endpoints:

- `EMAIL_IN_USE`
- `EMAIL_ALREADY_ADDED`
- `EMAIL_ALREADY_VERIFIED`
- `EMAIL_NOT_VERIFIED`
- `INVALID_CODE`
- `SEND_CODE_FAILED`
- `CANNOT_REMOVE_PRIMARY`
- `CANNOT_REMOVE_ONLY_EMAIL`
- Standard: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`
