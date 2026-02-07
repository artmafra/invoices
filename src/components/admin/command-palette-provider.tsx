"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useKeyboardShortcuts } from "@/components/admin/keyboard-shortcuts-provider";

// =============================================================================
// Types
// =============================================================================

interface CommandPaletteContextValue {
  /** Whether the command palette is open */
  open: boolean;
  /** Set the open state */
  setOpen: (open: boolean) => void;
  /** Toggle the open state */
  toggle: () => void;
  /** Current search input value (persisted between open/close) */
  searchValue: string;
  /** Set the search input value */
  setSearchValue: (value: string) => void;
  /** Counter that increments each time palette opens (used as key to force cmdk remount) */
  openCount: number;
}

// =============================================================================
// Context
// =============================================================================

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface CommandPaletteProviderProps {
  children: ReactNode;
}

/**
 * Provides command palette state.
 * Keyboard shortcut (Ctrl+K) is handled via KeyboardShortcutsProvider.
 */
export function CommandPaletteProvider({ children }: CommandPaletteProviderProps) {
  const [open, setOpenState] = useState(false);
  const [searchValue, setSearchValueState] = useState("");
  const [pendingRestore, setPendingRestore] = useState<string | null>(null);
  const [openCount, setOpenCount] = useState(0);
  const { registerHandler } = useKeyboardShortcuts();

  // When opening with existing search, clear it first, then restore after render
  // This forces cmdk to see a value change and auto-select the first item
  const setOpen = useCallback(
    (value: boolean) => {
      if (value) {
        setOpenCount((c) => c + 1);
        if (searchValue) {
          setPendingRestore(searchValue);
          setSearchValueState("");
        }
      }
      setOpenState(value);
    },
    [searchValue],
  );

  const toggle = useCallback(() => {
    setOpenState((prev) => {
      if (!prev) {
        setOpenCount((c) => c + 1);
        if (searchValue) {
          setPendingRestore(searchValue);
          setSearchValueState("");
        }
      }
      return !prev;
    });
  }, [searchValue]);

  // Restore search value after dialog opens (triggers cmdk filtering + auto-select)
  useEffect(() => {
    if (open && pendingRestore !== null) {
      const frame = requestAnimationFrame(() => {
        setSearchValueState(pendingRestore);
        setPendingRestore(null);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [open, pendingRestore]);

  // Wrapper to update search value
  const setSearchValue = useCallback((value: string) => {
    setSearchValueState(value);
  }, []);

  // Register keyboard shortcut handler
  useEffect(() => {
    return registerHandler("command-palette", toggle);
  }, [registerHandler, toggle]);

  return (
    <CommandPaletteContext.Provider
      value={{
        open,
        setOpen,
        toggle,
        searchValue,
        setSearchValue,
        openCount,
      }}
    >
      {children}
    </CommandPaletteContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Access command palette state and controls.
 * Must be used within CommandPaletteProvider.
 */
export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  }
  return context;
}
