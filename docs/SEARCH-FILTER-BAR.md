# SearchFilterBar

Reusable search + filter bar for admin pages with optional sorting and collapsible filters.

## Component

- `src/components/shared/search-filter-bar.tsx`
- Supports ref forwarding for focus shortcuts.
- Optional sorting dropdown and filter toggle.

## URL state

Use `useUrlFilters` to persist filters and sorting in the URL:

```tsx
import { useUrlFilters } from "@/hooks/admin/use-url-filters";

const { state, actions } = useUrlFilters(["status", "role"], {
  initialSortBy: "createdAt",
  initialSortOrder: "desc",
});
```

## Fuzzy search helper

```ts
import { fuzzyMatch } from "@/components/shared/search-filter-bar";
```

## Related

- `docs/KEYBOARD-SHORTCUTS.md`
