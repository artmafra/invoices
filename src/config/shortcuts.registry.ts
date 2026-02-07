/**
 * Keyboard Shortcuts Registry
 *
 * Central definition for all keyboard shortcuts in the admin interface.
 * Shortcuts are global and not permission-gated - they trigger actions
 * which may themselves check permissions.
 */

// =============================================================================
// Types
// =============================================================================

/** Modifier keys for shortcuts */
export type ShortcutModifier = "ctrl" | "meta" | "shift" | "alt";

/** Unique identifier for shortcuts */
export type ShortcutId =
  | "command-palette"
  | "focus-search"
  | "sidebar-toggle"
  | "go-home"
  | "go-settings"
  | "cycle-density";

export interface ShortcutDefinition {
  /** Unique identifier */
  id: ShortcutId;
  /** The key to press (lowercase, e.g., "k", "/", "b") */
  key: string;
  /** Required modifier keys */
  modifiers: ShortcutModifier[];
  /** Human-readable label */
  label: string;
  /** Description for help/documentation */
  description: string;
}

// =============================================================================
// Shortcuts Registry
// =============================================================================

/**
 * All registered keyboard shortcuts.
 * Add new shortcuts here and implement handlers in components.
 */
export const SHORTCUTS: ShortcutDefinition[] = [
  {
    id: "command-palette",
    key: "k",
    modifiers: ["ctrl"],
    label: "Command Palette",
    description: "Open the command palette to search commands",
  },
  {
    id: "focus-search",
    key: "/",
    modifiers: ["ctrl"],
    label: "Focus Search",
    description: "Focus the search input on the current page",
  },
  {
    id: "sidebar-toggle",
    key: "b",
    modifiers: ["ctrl"],
    label: "Toggle Sidebar",
    description: "Show or hide the sidebar",
  },
  {
    id: "go-home",
    key: "h",
    modifiers: ["ctrl", "shift"],
    label: "Go to Dashboard",
    description: "Navigate to the dashboard",
  },
  {
    id: "go-settings",
    key: ",",
    modifiers: ["ctrl"],
    label: "Go to Settings",
    description: "Navigate to system settings",
  },
  {
    id: "cycle-density",
    key: "d",
    modifiers: ["ctrl", "shift"],
    label: "Cycle Density",
    description: "Cycle through UI density modes (compact → comfortable → spacious)",
  },
];

/**
 * Get a shortcut definition by ID
 */
export function getShortcut(id: ShortcutId): ShortcutDefinition | undefined {
  return SHORTCUTS.find((s) => s.id === id);
}

/**
 * Check for duplicate key combinations in the registry.
 * Logs warnings in development mode.
 */
export function validateShortcuts(): void {
  if (process.env.NODE_ENV !== "development") return;

  const combinations = new Map<string, ShortcutId[]>();

  for (const shortcut of SHORTCUTS) {
    const combo = [...shortcut.modifiers.sort(), shortcut.key].join("+");
    const existing = combinations.get(combo) || [];
    existing.push(shortcut.id);
    combinations.set(combo, existing);
  }

  for (const [combo, ids] of combinations) {
    if (ids.length > 1) {
      console.warn(
        `[Shortcuts Registry] Duplicate key combination "${combo}" found for shortcuts: ${ids.join(", ")}`,
      );
    }
  }
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Format a shortcut for display based on platform.
 * @param shortcut - The shortcut definition
 * @param isMac - Whether the user is on a Mac-like platform
 * @returns Formatted string like "⌘K" or "Ctrl+K"
 */
export function formatShortcut(shortcut: ShortcutDefinition, isMac: boolean): string {
  const symbols: Record<ShortcutModifier, string> = isMac
    ? { ctrl: "⌘", meta: "⌘", shift: "⇧", alt: "⌥" }
    : { ctrl: "Ctrl", meta: "Win", shift: "Shift", alt: "Alt" };

  const parts: string[] = [];

  // Order: Ctrl/Cmd, Alt, Shift, Key
  if (shortcut.modifiers.includes("ctrl") || shortcut.modifiers.includes("meta")) {
    parts.push(symbols.ctrl);
  }
  if (shortcut.modifiers.includes("alt")) {
    parts.push(symbols.alt);
  }
  if (shortcut.modifiers.includes("shift")) {
    parts.push(symbols.shift);
  }

  // Format the key
  const keyDisplay = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
  parts.push(keyDisplay);

  // Join with + for non-Mac, concatenate for Mac
  return isMac ? parts.join("") : parts.join("+");
}

/**
 * Get all shortcuts formatted for display
 */
export function getFormattedShortcuts(
  isMac: boolean,
): Array<ShortcutDefinition & { formatted: string }> {
  return SHORTCUTS.map((s) => ({
    ...s,
    formatted: formatShortcut(s, isMac),
  }));
}
