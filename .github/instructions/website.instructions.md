---
applyTo: "**"
---

# Website Template Instructions (AI)

Full-stack Next.js 16 template with admin dashboard, auth (2FA + passkeys), RBAC, multi-apps, Gmail API, and Google Cloud Storage.
Backward compatibility is not required; refactor freely when improving this template.
Next.js 16 uses `proxy.ts` (not `middleware.ts`) for request middleware.

## Tech stack

- Next.js 16, React 19, TypeScript 5
- Drizzle ORM (PostgreSQL), Zod 4, NextAuth.js 5
- TailwindCSS 4, shadcn/ui, TanStack Query/Table

## Architecture and code layout

- Layers: schema -> storage -> services -> API -> hooks/UI. See `/docs/ARCHITECTURE.md`.
- Schema: `src/schema` (one file per table or enum).
- Storage: `src/storage` with `BaseStorage<T>`; return raw entities, minimal logic.
- Services: `src/services` for business rules; never import `db` directly. Services return DTOs, not raw entities.
- DTOs: `src/dtos` transform raw entities to API responses with date serialization and field selection.
- API: `src/app/api` route handlers use services + Zod validation.
- Hooks: `src/hooks` for React Query data access.
- UI: `src/components` and `src/app` pages.
- Files follow `<entity>.<layer>.ts` (example: `task.service.ts`, `task.storage.ts`).

## API standards

- Always wrap route handlers with `withErrorHandler`; throw `ApiError` subclasses. See `/docs/ERROR-HANDLING.md`.
- Request schemas live in `src/validations` (`*Request` suffix); response schemas in `src/types` (`*Response` suffix).
- Error shape: `{ error, code, details? }`. See `/docs/ERROR-HANDLING.md`.
- Enforce RBAC in routes: `requirePermission()` on server, `hasPermission()` on client. See `/docs/PERMISSIONS.md`.
- Rate limit sensitive endpoints with `withRateLimit()`. See `/docs/RATE-LIMITING.md`.
- Use ETag helpers for GET list endpoints when possible. See `/docs/HTTP-CACHING.md`.
- Log mutations via `activityService.logCreate/Update/Delete`. See `/docs/ACTIVITY.md`.

## Query hooks (React Query)

- Define `QUERY_KEYS` per feature with `all/lists/list/detail` helpers to keep invalidation consistent.
- Use these keys for `useQuery` and `invalidateQueries` instead of ad-hoc arrays.

```ts
export const QUERY_KEYS = {
  all: ["admin", "resource"] as const,
  lists: () => [...QUERY_KEYS.all, "list"] as const,
  list: (page: number) => [...QUERY_KEYS.lists(), page] as const,
  detail: (id: string) => [...QUERY_KEYS.all, id] as const,
} as const;
```

## Auth and security

- Auth.js v5 with custom providers; policies in `src/lib/auth`. See `/docs/AUTH-ARCHITECTURE.md`.
- Step-up auth required for sensitive actions. See `/docs/STEP-UP-AUTH.md`.
- Token system powers verification flows (password reset, invites, email change, 2FA). See `/docs/TOKENS.md`.
- Sessions are tracked in DB with admin controls. See `/docs/SESSIONS.md`.
- Passkeys/WebAuthn are supported. See `/docs/PASSKEYS.md`.
- Multi-email support and rules. See `/docs/MULTI-EMAIL.md`.
- Data encryption uses `ENCRYPTION_KEY` (AES-256-GCM). See `/docs/ENCRYPTION.md`.

## Admin UI patterns

- Layout: `SidebarInset` -> `AdminHeader` -> `PageContainer` -> content. See `/docs/UI-PATTERNS.md`.
- AdminHeader action buttons use `size="sm"` and `variant="outline"`.
- Use dialogs (and drawers on mobile) for forms. See `/docs/UI-PATTERNS.md`.
- Shared components in `src/components/shared`: `LoadingState`, `ErrorAlert`, `ConfirmDialog`, `SearchFilterBar`, `RequirePermission`.
- Wrap admin page content with `RequirePermission`; gate buttons with `canCreate/canEdit/canDelete`.
- Use `SearchFilterBar` + `useUrlFilters` for list pages. See `/docs/SEARCH-FILTER-BAR.md`.
- Register new pages/actions in the command palette. See `/docs/COMMAND-PALETTE.md`.
- Keyboard shortcuts live in `/src/config/shortcuts.registry.ts`. See `/docs/KEYBOARD-SHORTCUTS.md`.
- Use `MultiStepContainer` for step flows. See `/docs/MULTI-STEP-TRANSITIONS.md`.
- Icons: lucide-react only.

## Settings, preferences, and i18n

- Settings are registry-driven in `src/config/settings.registry.ts`; `sensitive: true` auto-encrypts. See `/docs/SETTINGS.md`.
- Preferences are cookie-based; use `usePreferences` and `getPreferencesFromCookies`. See `/docs/PREFERENCES.md`.
- i18n uses `next-intl` with JSON namespaces in `src/locales/<locale>`. See `/docs/I18N.md`.
- Supported locales: `en-US` (default), `pt-BR`; locale detection is cookie-based in `proxy.ts` (no URL prefix).
- Add keys to `en-US` first, then copy to other locales.

## Apps, commands, and navigation

- Apps are registry-driven in `src/config/apps.registry.ts` and gated by `app_permissions`. See `/docs/APPS.md`.
- Commands live in `src/config/commands.registry.ts` (used by command palette). See `/docs/COMMAND-PALETTE.md`.

## Email, storage, and background jobs

- React Email templates live in `src/emails`; use `renderEmailBoth()` for HTML + text.
- Gmail API setup and sending flow: `/docs/GMAIL.md`.
- Cloud Storage image proxy: `/api/storage/<key>`; use `cloud-storage.service`. See `/docs/STORAGE.md`.
- Background jobs use BullMQ; email worker in `src/workers/email.worker.ts`. See `/docs/QUEUE.md`.

## Observability and caching

- Use `logger` from `src/lib/logger.ts` in server code; avoid it in edge/runtime (`proxy.ts`). See `/docs/LOGGING.md`.
- Prefer ETag helpers for list endpoints. See `/docs/HTTP-CACHING.md`.

## UI and code conventions

- Imports must use `@/` alias (no `../`).
- Tailwind classes use semantic tokens (e.g., `bg-background`, `text-foreground`).
- Avoid hardcoded colors like `text-green-500`; use semantic tokens such as `text-success`, `text-destructive`, `bg-warning`. Check `src/globals.css` for available tokens.
- Admin forms: `FieldGroup` uses `w-full md:max-w-sm`; submit buttons use `LoadingButton` with `loading`/`loadingText`.

## Operations and workflows

- Environment variables: `/docs/ENVIRONMENT.md`.
- Migrations: `/docs/MIGRATIONS.md`.
- Testing guidance: `/docs/TESTING.md`.

## AI agent workflow

1. Run `npm run help` to discover commands.
2. After changes: `npm run check:lint`, `npm run check:types`, `npm run check:format`.
3. Prefer `--json` for machine-readable output.
4. Script metadata lives in `/scripts/manifest.json`.

## Pre-completion checklist

- i18n: no hard-coded strings; use `useTranslations`.
- Command palette: add new pages/actions to registry.
- Spacing: match margins and padding with similar pages/components.
- Permissions: guard protected UI and APIs.
- Activity log: log create/update/delete.
- Validation: add Zod request schemas and response types.
- Loading/error states: use shared components.
- Mobile: verify responsive behavior.
