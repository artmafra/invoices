# Preferences

User preferences are stored in cookies and are device-bound (persist across logout and user switching).

## Examples

- Pagination size
- Timezone
- Language

## Key files

- `src/lib/preferences/preferences.types.ts`
- `src/lib/preferences/use-preferences.ts`
- `src/lib/preferences/preferences.server.ts`
- `src/lib/preferences/cookies.ts`

## Usage (client)

```tsx
import { usePreferences } from "@/lib/preferences";

const { preferences, updatePreference } = usePreferences();
```

## Usage (server)

Use `getPreferencesFromCookies` from `src/lib/preferences/preferences.server.ts` to read values in server components.
