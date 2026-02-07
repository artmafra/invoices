# Settings System

Central registry-backed settings with type safety, scopes, and optional encryption for sensitive values.

## Overview

- Settings are defined in a registry and stored in the database.
- Each setting has a type, category, scope, and default value.
- Sensitive settings are hidden from non-system users and encrypted at rest.

## Key files

| Area     | Path                                    |
| -------- | --------------------------------------- |
| Registry | `src/config/settings.registry.ts`       |
| Schema   | `src/schema/settings.schema.ts`         |
| Storage  | `src/storage/setting.storage.ts`        |
| Service  | `src/services/settings.service.ts`      |
| API      | `src/app/api/admin/settings/route.ts`   |
| API      | `src/app/api/settings/route.ts`         |
| Hook     | `src/hooks/admin/use-admin-settings.ts` |
| Provider | `src/components/settings-provider.tsx`  |

## Types, scopes, categories

- Types: `string`, `boolean`, `number`, `json`, `image`, `select`
- Scopes: `public`, `system`
- Categories: `branding`, `contact`, `social`, `seo`, `email`, `general`, `security`

## Defining settings

```ts
// src/config/settings.registry.ts

defineStringSetting("hero_title", {
  label: "Hero Title",
  defaultValue: "Build Something Amazing",
  description: "Main homepage heading",
  category: "branding",
  scope: "public",
});
```

## Sensitive settings and encryption

- Mark settings with `sensitive: true` to encrypt values at rest.
- Encryption uses `ENCRYPTION_KEY` (AES-256-GCM).
- Rotate keys with `ENCRYPTION_KEYS_LEGACY` and `npm run db:reencrypt`.

## Server-side usage

```ts
import { settingsService } from "@/services/runtime/settings";

const siteName = await settingsService.getSettingValue("hero_title");
const publicSettings = await settingsService.getPublicSettings();
```

## Client-side usage

```tsx
import { useSettings } from "@/components/settings-provider";

const { settings } = useSettings();
const heroTitle = settings.hero_title;
```

## Admin endpoints

- `GET /api/admin/settings` (filters: `key`, `category`, `scope`, `search`)
- `POST /api/admin/settings` (upsert via form data)
- `DELETE /api/admin/settings/:key`
- `POST /api/admin/settings/upload-image`

## Seeding

Defaults are inserted by `npm run db:seed`.

## Adding new settings

1. Define the setting in `src/config/settings.registry.ts`.
2. Run `npm run db:seed` to insert defaults.
3. Use the key via `settingsService` or the settings provider.
