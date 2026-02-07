"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  SHORTCUTS,
  validateShortcuts,
  type ShortcutId,
  type ShortcutModifier,
} from "@/config/shortcuts.registry";
import { DENSITY_CYCLE } from "@/config/ui.config";
import { usePreferences } from "@/lib/preferences/use-preferences";

// =============================================================================
// Types
// =============================================================================

type ShortcutHandler = () => void;

interface KeyboardShortcutsContextValue {
  /** Register a handler for a shortcut. Returns unregister function. */
  registerHandler: (shortcutId: ShortcutId, handler: ShortcutHandler) => () => void;
  /** Manually trigger a shortcut handler (useful for testing) */
  triggerShortcut: (shortcutId: ShortcutId) => void;
}

// =============================================================================
// Context
// =============================================================================

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

/**
 * Provides centralized keyboard shortcut handling.
 * Components register handlers for shortcuts defined in the registry.
 */
export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const router = useRouter();
  const { prefs, setPref } = usePreferences();

  // Store handlers in a ref to avoid re-renders when handlers change
  const handlersRef = useRef<Map<ShortcutId, ShortcutHandler>>(new Map());

  // Cycle density function
  const cycleDensity = useCallback(() => {
    const currentIndex = DENSITY_CYCLE.indexOf(prefs.density);
    const nextIndex = (currentIndex + 1) % DENSITY_CYCLE.length;
    const nextDensity = DENSITY_CYCLE[nextIndex];
    setPref("density", nextDensity);
  }, [prefs.density, setPref]);

  // Validate shortcuts on mount (dev only)
  useEffect(() => {
    validateShortcuts();
  }, []);

  // Register global navigation shortcuts
  useEffect(() => {
    const handlers = handlersRef.current;
    handlers.set("go-home", () => router.push("/admin"));
    handlers.set("go-settings", () => router.push("/admin/system/settings"));

    return () => {
      handlers.delete("go-home");
      handlers.delete("go-settings");
    };
  }, [router]);

  // Register density cycle shortcut
  useEffect(() => {
    const handlers = handlersRef.current;
    handlers.set("cycle-density", cycleDensity);

    return () => {
      handlers.delete("cycle-density");
    };
  }, [cycleDensity]);

  // Single keydown listener for all shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea (unless it's a ctrl/meta combo)
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Find matching shortcut
      for (const shortcut of SHORTCUTS) {
        const modifiersMatch = checkModifiers(e, shortcut.modifiers);
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (modifiersMatch && keyMatches) {
          // For shortcuts without modifiers (like "/"), skip if typing
          const hasModifiers = shortcut.modifiers.length > 0;
          if (isTyping && !hasModifiers) {
            continue;
          }

          // For modifier shortcuts, allow even when typing
          const handler = handlersRef.current.get(shortcut.id);
          if (handler) {
            e.preventDefault();
            handler();
            return;
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const registerHandler = useCallback(
    (shortcutId: ShortcutId, handler: ShortcutHandler): (() => void) => {
      handlersRef.current.set(shortcutId, handler);
      return () => {
        handlersRef.current.delete(shortcutId);
      };
    },
    [],
  );

  const triggerShortcut = useCallback((shortcutId: ShortcutId) => {
    const handler = handlersRef.current.get(shortcutId);
    if (handler) {
      handler();
    }
  }, []);

  return (
    <KeyboardShortcutsContext.Provider
      value={{
        registerHandler,
        triggerShortcut,
      }}
    >
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Access the keyboard shortcuts system.
 * Must be used within KeyboardShortcutsProvider.
 */
export function useKeyboardShortcuts(): KeyboardShortcutsContextValue {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error("useKeyboardShortcuts must be used within a KeyboardShortcutsProvider");
  }
  return context;
}

/**
 * Register a keyboard shortcut handler.
 * Automatically unregisters on unmount.
 *
 * @param shortcutId - The shortcut to handle
 * @param handler - Callback to execute when shortcut is triggered
 * @param deps - Dependencies for the handler (like useCallback deps)
 */
export function useShortcut(
  shortcutId: ShortcutId,
  handler: ShortcutHandler,
  deps: React.DependencyList = [],
): void {
  const { registerHandler } = useKeyboardShortcuts();

  useEffect(() => {
    return registerHandler(shortcutId, handler);
    // Handler omitted - caller controls re-registration via deps param (same pattern as useCallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcutId, registerHandler, ...deps]);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if the pressed modifiers match the shortcut definition.
 * Treats ctrl and meta as equivalent for cross-platform support.
 */
function checkModifiers(e: KeyboardEvent, modifiers: ShortcutModifier[]): boolean {
  const needsCtrlOrMeta = modifiers.includes("ctrl") || modifiers.includes("meta");
  const hasCtrlOrMeta = e.ctrlKey || e.metaKey;

  const needsShift = modifiers.includes("shift");
  const needsAlt = modifiers.includes("alt");

  // Check required modifiers
  if (needsCtrlOrMeta && !hasCtrlOrMeta) return false;
  if (needsShift && !e.shiftKey) return false;
  if (needsAlt && !e.altKey) return false;

  // Check for extra modifiers (shouldn't have any not in the list)
  if (!needsCtrlOrMeta && hasCtrlOrMeta) return false;
  if (!needsShift && e.shiftKey) return false;
  if (!needsAlt && e.altKey) return false;

  return true;
}
