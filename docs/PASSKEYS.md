# Passkeys (WebAuthn)

Passkeys provide passwordless authentication using WebAuthn.

## Configuration

- `WEBAUTHN_RP_ID` (domain, e.g. `example.com`)
- `WEBAUTHN_ORIGINS` (comma-separated origins)

Passkeys registered on one domain cannot be used on another.

## Data model

- `passkey_credentials` stores credentials for each user
- `passkey_challenges` stores short-lived registration/auth challenges

## Flows

### Registration (profile)

1. `POST /api/profile/passkeys/register/options` (step-up required)
2. `POST /api/profile/passkeys/register/verify`

### Authentication (login)

1. `POST /api/auth/passkey/authenticate/options`
2. `POST /api/auth/passkey/authenticate/verify`

### Management

- `GET /api/profile/passkeys`
- `PATCH /api/profile/passkeys/:id` (rename)
- `DELETE /api/profile/passkeys/:id` (step-up required)

## Security notes

- Challenges are stored raw (required for WebAuthn verification).
- Delete operations require step-up authentication.
- Failed or expired challenges return validation errors.

## Key files

- `src/services/passkey.service.ts`
- `src/storage/passkey-credential.storage.ts`
- `src/storage/passkey-challenge.storage.ts`
- `src/validations/passkey.validations.ts`

## Dependencies

- `@simplewebauthn/server`
- `@simplewebauthn/browser`
