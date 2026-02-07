"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// =============================================================================
// Custom Event for Same-Page Actions
// =============================================================================

export const COMMAND_ACTION_EVENT = "command-palette:action";

export interface CommandActionEvent {
  action: string;
}

/**
 * Dispatch a command action event (used when already on target page)
 */
export function dispatchCommandAction(action: string) {
  window.dispatchEvent(
    new CustomEvent<CommandActionEvent>(COMMAND_ACTION_EVENT, {
      detail: { action },
    }),
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook that detects an action from URL query params OR custom events and triggers a callback.
 * - URL params: Used when navigating from a different page
 * - Custom events: Used when action is triggered while already on the page
 *
 * @param action - The action to listen for (e.g., "create")
 * @param callback - Function to call when action is detected
 *
 * @example
 * ```tsx
 * useActionFromUrl("create", () => {
 *   setShowCreateDialog(true);
 * });
 * ```
 */
export function useActionFromUrl(action: string, callback: () => void) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const hasTriggeredUrl = useRef(false);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Listen for URL-based actions (from navigation)
  useEffect(() => {
    const urlAction = searchParams.get("action");

    // Reset when action is not present
    if (urlAction !== action) {
      hasTriggeredUrl.current = false;
      return;
    }

    // Prevent duplicate triggers
    if (hasTriggeredUrl.current) {
      return;
    }

    hasTriggeredUrl.current = true;

    // Clear the action param from URL
    const params = new URLSearchParams(searchParams.toString());
    params.delete("action");
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });

    // Trigger the callback after a brief delay to let the page render
    requestAnimationFrame(() => {
      callbackRef.current();
    });
  }, [searchParams, action, router, pathname]);

  // Listen for custom event actions (from same-page triggers)
  useEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent<CommandActionEvent>;
      if (customEvent.detail.action === action) {
        callbackRef.current();
      }
    };

    window.addEventListener(COMMAND_ACTION_EVENT, handleEvent);
    return () => window.removeEventListener(COMMAND_ACTION_EVENT, handleEvent);
  }, [action]);
}
