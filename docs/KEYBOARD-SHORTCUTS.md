# Keyboard Shortcuts

Central registry for admin UI keyboard shortcuts. Shortcuts are global and not permission-gated; handlers still enforce permissions where needed.

## Key files

| Area            | Path                                                   |
| --------------- | ------------------------------------------------------ |
| Registry        | `src/config/shortcuts.registry.ts`                     |
| Provider + hook | `src/components/admin/keyboard-shortcuts-provider.tsx` |
| Command palette | `src/components/admin/command-palette.tsx`             |

## Registered shortcuts

| ID                | Keys (Win/Linux) | Keys (Mac)    | Description          |
| ----------------- | ---------------- | ------------- | -------------------- |
| `command-palette` | `Ctrl+K`         | `Cmd+K`       | Open command palette |
| `focus-search`    | `Ctrl+/`         | `Cmd+/`       | Focus search input   |
| `sidebar-toggle`  | `Ctrl+B`         | `Cmd+B`       | Toggle sidebar       |
| `go-home`         | `Ctrl+Shift+H`   | `Cmd+Shift+H` | Go to dashboard      |
| `go-settings`     | `Ctrl+,`         | `Cmd+,`       | Go to settings       |

## Usage

```tsx
import { useShortcut } from "@/components/admin/keyboard-shortcuts-provider";

useShortcut("focus-search", () => {
  searchRef.current?.focus();
});
```

## Display helpers

Use `formatShortcut()` from the registry to render platform-specific labels.

```tsx
import { formatShortcut, getShortcut } from "@/config/shortcuts.registry";

const shortcut = getShortcut("command-palette");
const label = shortcut ? formatShortcut(shortcut, isMac) : null;
```

## Notes

- Modifier shortcuts work even when inputs are focused.
- Non-modifier shortcuts are ignored while typing in inputs/textareas.
