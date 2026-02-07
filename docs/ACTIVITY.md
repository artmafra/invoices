# Activity Log

Audit trail for admin and security events.

## Overview

- Stored in `activity_logs` table with actor, target, metadata, and timestamps.
- Uses HMAC signatures for integrity verification.
- Admin UI supports filtering and verification.

## Logging helpers

```ts
import { activityService } from "@/services/runtime/activity";

await activityService.logCreate(session, "users", { type: "user", id, name });
await activityService.logUpdate(session, "users", { type: "user", id }, changes);
await activityService.logDelete(session, "users", { type: "user", id });
```

## Integrity verification

- Signatures use `ENCRYPTION_KEY` (HMAC-SHA256).
- Verification API: `POST /api/admin/activity/verify`.

## Admin endpoints

- `GET /api/admin/activity`
- `GET /api/admin/activity/filters`
- `POST /api/admin/activity/verify`

## Key files

- `src/schema/activity-logs.schema.ts`
- `src/services/activity.service.ts`
- `src/lib/activity/*`
- `src/app/api/admin/activity/*`
