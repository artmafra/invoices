# Permissions

Resource-action permissions for admin and app modules.

## Overview

- Core permissions live in `src/lib/permissions/types.ts`.
- Helpers live in `src/lib/permissions/functions.ts`.
- Per-app permissions are stored in `app_permissions` and scoped by module.

## Format

Permissions use `resource.action` strings (e.g., `users.view`, `settings.edit`).

## Server-side usage

```ts
import { requirePermission } from "@/lib/permissions";

const { authorized, error, status } = await requirePermission("users", "view");
```

## Client-side usage

```tsx
import { hasPermission } from "@/lib/permissions";

const canEdit = hasPermission(session, "users", "edit");
```

## Key files

- `src/lib/permissions/types.ts`
- `src/lib/permissions/functions.ts`
- `src/schema/role-permissions.schema.ts`
- `src/schema/app-permissions.schema.ts`

---

## Dual-Layer Permission Architecture

This application uses a **defense-in-depth** approach with two layers of permission checks:

### Layer 1: Server-Side (Security Boundary)

**Purpose:** Prevent unauthorized access before sending any HTML to the client.

**Implementation:**

- Used in Server Components (page.tsx files)
- Checks permissions via `hasPermission()` before rendering
- Redirects to `/admin/unauthorized` if unauthorized
- Required for **sensitive pages** (user management, roles, sessions, settings, activity logs)

**Example:**

```tsx
// src/app/admin/(protected)/system/users/page.tsx
export default async function AdminUsersPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (!hasPermission(session, "users", "view")) {
    redirect("/admin/unauthorized"); // Security boundary
  }

  return <UsersPageContent />;
}
```

**Benefits:**

- Unauthorized users never receive page HTML
- Cannot be bypassed via browser DevTools
- True security enforcement

### Layer 2: Client-Side (UX Optimization)

**Purpose:** Provide instant feedback without waiting for API calls or page navigation.

**Implementation:**

- Used in Client Components via `<RequirePermission>` wrapper
- Checks permissions from session context
- Shows loading state while session loads
- Shows 403 error UI if unauthorized

**Example:**

```tsx
// Inside a client component
<RequirePermission resource="tasks">
  <TasksPageContent />
</RequirePermission>
```

**Benefits:**

- Instant UI feedback (no API round-trip)
- Better user experience (shows why access is denied)
- Reduces unnecessary API calls

**Limitations:**

- ⚠️ Can be bypassed via browser DevTools
- ⚠️ Not a security boundary
- ⚠️ Should always be backed by server-side checks (API routes)

### When to Use Each Layer

| Scenario                                     | Server Check  | Client Check   | API Check     |
| -------------------------------------------- | ------------- | -------------- | ------------- |
| **Sensitive pages** (users, roles, settings) | ✅ Required   | ✅ Recommended | ✅ Required   |
| **App pages** (tasks, notes, games)          | ❌ Optional   | ✅ Recommended | ✅ Required   |
| **API endpoints**                            | N/A           | N/A            | ✅ Required   |
| **Public pages**                             | ❌ Not needed | ❌ Not needed  | ❌ Not needed |

### Pattern Summary

```
┌──────────────────────────────────────────────────────────┐
│  SERVER COMPONENT (page.tsx)                             │
│  ├─ await auth()                                         │
│  ├─ hasPermission(session, resource, action)            │
│  └─ redirect("/admin/unauthorized") if unauthorized     │
│                                                           │
│     ✅ Security Boundary                                 │
│     ✅ Cannot be bypassed                                │
│     ✅ Prevents HTML from being sent                     │
└──────────────────────────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│  CLIENT COMPONENT (*-page-content.tsx)                   │
│  └─ <ErrorBoundary>                                      │
│       └─ <SidebarInset>                                  │
│            └─ Page content with hooks & interactivity    │
│                                                           │
│     ✅ UX Layer                                          │
│     ⚠️  Can be bypassed in DevTools                      │
│     ✅ Instant feedback for users                        │
└──────────────────────────────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────┐
│  API ROUTES (/api/*)                                     │
│  └─ requirePermission(resource, action)                  │
│                                                           │
│     ✅ Final Enforcement                                 │
│     ✅ Cannot be bypassed                                │
│     ✅ Protects data access                              │
└──────────────────────────────────────────────────────────┘
```

### Migration Guide

**For new pages:**

1. Use server-side checks for sensitive pages
2. Use client-side checks for UX optimization
3. Always protect API routes with `requirePermission()`

**For existing pages:**

- Sensitive pages have been migrated to server-side checks (users, roles, sessions, settings, activity)
- App pages can remain client-only for now (tasks, notes, games)
- All API routes already have proper enforcement

### Security Considerations

1. **Never rely solely on client-side checks** for security
2. **Always enforce permissions in API routes** using `requirePermission()`
3. **Use server-side checks** for pages that manage security settings or sensitive data
4. **Client-side checks are for UX only** - they improve user experience but don't prevent determined users from viewing page structure
