# API Reference

Summary of HTTP endpoints. All responses are JSON unless noted.

## Conventions

- Authenticated endpoints rely on the Auth.js session (`@/lib/auth`).
- Error shape: `{ error: string, code: string, details?: unknown }`.
- Rate limiting: `docs/RATE-LIMITING.md`.
- ETag: list endpoints may support conditional requests via `If-None-Match`.

## Auth

| Method | Path                                     | Purpose                                       |
| ------ | ---------------------------------------- | --------------------------------------------- |
| `POST` | `/api/auth/forgot-password`              | Start password reset (always returns success) |
| `GET`  | `/api/auth/reset-password?token=`        | Validate reset token                          |
| `POST` | `/api/auth/reset-password`               | Complete password reset                       |
| `POST` | `/api/auth/invite`                       | Accept invitation                             |
| `GET`  | `/api/auth/invite?token=`                | Validate invitation token                     |
| `POST` | `/api/auth/pending-2fa`                  | Validate pending 2FA token (login flow)       |
| `POST` | `/api/auth/2fa/resend`                   | Resend login 2FA code                         |
| `POST` | `/api/auth/revoke-session`               | Revoke current session                        |
| `GET`  | `/api/auth/session-refresh`              | Refresh session payload                       |
| `POST` | `/api/auth/step-up`                      | Issue step-up auth token                      |
| `POST` | `/api/auth/passkey/authenticate/options` | Get passkey auth options                      |
| `POST` | `/api/auth/passkey/authenticate/verify`  | Verify passkey auth                           |
| `*`    | `/api/auth/[...nextauth]`                | Auth.js provider endpoints                    |

## Profile (authenticated user)

| Method            | Path                                       | Purpose                                 |
| ----------------- | ------------------------------------------ | --------------------------------------- |
| `GET/PUT`         | `/api/profile`                             | Get/update profile                      |
| `POST/DELETE`     | `/api/profile/avatar`                      | Upload or delete avatar                 |
| `POST/PUT/DELETE` | `/api/profile/email-change`                | Request, verify, or cancel email change |
| `GET/POST`        | `/api/profile/emails`                      | List/add secondary emails               |
| `GET/DELETE`      | `/api/profile/emails/:id`                  | Fetch or remove an email                |
| `POST/PUT`        | `/api/profile/emails/:id/verify`           | Send verification code / verify code    |
| `PATCH`           | `/api/profile/emails/:id/primary`          | Set primary email                       |
| `PATCH`           | `/api/profile/locale`                      | Update locale preference                |
| `PUT`             | `/api/profile/password`                    | Change password                         |
| `GET`             | `/api/profile/sessions`                    | List sessions                           |
| `POST`            | `/api/profile/sessions`                    | Create session                          |
| `DELETE`          | `/api/profile/sessions/:sessionId`         | Revoke session                          |
| `DELETE`          | `/api/profile/sessions/all`                | Revoke all sessions                     |
| `GET`             | `/api/profile/login-history`               | Login history                           |
| `GET/POST/DELETE` | `/api/profile/google-link`                 | Link/unlink Google account              |
| `GET`             | `/api/profile/2fa`                         | Current 2FA status                      |
| `POST`            | `/api/profile/2fa/email/setup`             | Start email 2FA setup                   |
| `POST`            | `/api/profile/2fa/email/enable`            | Enable email 2FA                        |
| `POST`            | `/api/profile/2fa/email/disable`           | Disable email 2FA                       |
| `POST`            | `/api/profile/2fa/totp/setup`              | Start TOTP setup                        |
| `POST`            | `/api/profile/2fa/totp/enable`             | Enable TOTP                             |
| `POST`            | `/api/profile/2fa/totp/disable`            | Disable TOTP                            |
| `POST`            | `/api/profile/2fa/backup-codes/regenerate` | Regenerate backup codes                 |
| `GET`             | `/api/profile/passkeys`                    | List passkeys                           |
| `POST`            | `/api/profile/passkeys/register/options`   | Get passkey registration options        |
| `POST`            | `/api/profile/passkeys/register/verify`    | Verify passkey registration             |
| `PATCH/DELETE`    | `/api/profile/passkeys/:id`                | Rename or delete passkey                |
| `POST/PUT`        | `/api/profile/verify-email`                | Send or verify primary email            |

## Settings (public)

| Method | Path                            | Purpose                         |
| ------ | ------------------------------- | ------------------------------- |
| `GET`  | `/api/settings`                 | Public settings by category/key |
| `GET`  | `/api/settings/password-policy` | Public password policy          |

## Admin (permissions required)

### Users and access

| Method        | Path                                       | Purpose                        |
| ------------- | ------------------------------------------ | ------------------------------ |
| `GET/POST`    | `/api/admin/users`                         | List/create users              |
| `PUT`         | `/api/admin/users/:userId`                 | Update user                    |
| `DELETE`      | `/api/admin/users/:userId?permanent=`      | Deactivate or delete user      |
| `POST`        | `/api/admin/users/:userId/deactivate`      | Deactivate user                |
| `POST`        | `/api/admin/users/:userId/reactivate`      | Reactivate user                |
| `POST`        | `/api/admin/users/:userId/unlock`          | Unlock account                 |
| `GET/PUT`     | `/api/admin/users/:userId/app-permissions` | Get/update per-app permissions |
| `GET`         | `/api/admin/users/:userId/hover`           | Hover card data                |
| `POST/DELETE` | `/api/admin/users/:userId/impersonate`     | Start/end impersonation        |
| `GET/POST`    | `/api/admin/users/invite`                  | List/create invitations        |
| `PUT`         | `/api/admin/users/invite/:inviteId`        | Resend invitation              |
| `DELETE`      | `/api/admin/users/invite/:inviteId`        | Cancel invitation              |

### Roles and permissions

| Method     | Path                       | Purpose             |
| ---------- | -------------------------- | ------------------- |
| `GET/POST` | `/api/admin/roles`         | List/create roles   |
| `PUT`      | `/api/admin/roles/:roleId` | Update role         |
| `DELETE`   | `/api/admin/roles/:roleId` | Delete role         |
| `GET`      | `/api/admin/permissions`   | Permission registry |

### Sessions and activity

| Method   | Path                                | Purpose                    |
| -------- | ----------------------------------- | -------------------------- |
| `GET`    | `/api/admin/sessions`               | List sessions              |
| `DELETE` | `/api/admin/sessions/:sessionId`    | Revoke single session      |
| `DELETE` | `/api/admin/sessions/users/:userId` | Revoke all user sessions   |
| `GET`    | `/api/admin/activity`               | Audit log (ETag supported) |
| `GET`    | `/api/admin/activity/filters`       | Activity filter options    |
| `POST`   | `/api/admin/activity/verify`        | Verify log integrity       |

### Apps and settings

| Method   | Path                               | Purpose                        |
| -------- | ---------------------------------- | ------------------------------ |
| `GET`    | `/api/admin/apps/enabled`          | Registry of apps               |
| `GET`    | `/api/admin/apps/user`             | Apps available to current user |
| `GET`    | `/api/admin/settings`              | List settings                  |
| `POST`   | `/api/admin/settings`              | Create/update setting          |
| `DELETE` | `/api/admin/settings/:key`         | Delete setting                 |
| `POST`   | `/api/admin/settings/upload-image` | Upload setting images          |

### Content (notes, tasks, games, tags, images)

| Method             | Path                                  | Purpose                  |
| ------------------ | ------------------------------------- | ------------------------ |
| `GET/POST`         | `/api/admin/notes`                    | List/create notes        |
| `GET/PATCH/DELETE` | `/api/admin/notes/:noteId`            | Manage note              |
| `PATCH`            | `/api/admin/notes/:noteId/archive`    | Archive/unarchive note   |
| `POST`             | `/api/admin/notes/:noteId/toggle-pin` | Pin/unpin note           |
| `GET/POST`         | `/api/admin/tasks`                    | List/create tasks        |
| `GET/PATCH/DELETE` | `/api/admin/tasks/:taskId`            | Manage task              |
| `GET/POST`         | `/api/admin/tasks/lists`              | List/create task lists   |
| `GET/PATCH/DELETE` | `/api/admin/tasks/lists/:listId`      | Manage task list         |
| `GET/POST`         | `/api/admin/games`                    | List/create games        |
| `GET/PATCH/DELETE` | `/api/admin/games/:gameId`            | Manage game              |
| `POST/DELETE`      | `/api/admin/games/:gameId/cover`      | Upload/remove game cover |
| `GET`              | `/api/admin/tags`                     | Search tags              |
| `GET/POST`         | `/api/admin/images`                   | List/upload images       |

## Storage

- `GET /api/storage/<key>` - Serves images stored under `images/` in Cloud Storage.

## Cron

- `GET /api/cron/cleanup` - Scheduled cleanup (requires `Authorization: Bearer <CRON_SECRET>`).
