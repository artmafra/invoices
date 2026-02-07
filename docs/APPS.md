# Apps System

Apps are modular feature areas defined in a registry and enabled per user.

## Overview

- Apps are defined in `src/config/apps.registry.ts`.
- App access is stored in `app_permissions` (per-user entitlements).
- Example apps: notes, tasks, games.

## Adding an app (summary)

1. Add a definition to `APPS_REGISTRY`.
2. Create UI routes under `src/app/admin/(protected)/<slug>`.
3. Add storage/services for new data models.
4. Add permissions and seed data if needed.

## Key files

- `src/config/apps.registry.ts`
- `src/schema/app-permissions.schema.ts`
- `src/services/app-permissions.service.ts`
- `src/app/api/admin/apps/*`
