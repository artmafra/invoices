"use client";

import { startTransition, useEffect, useState } from "react";

/**
 * Detects if the user is on a Mac-like platform (macOS or iOS).
 * Returns true for macOS/iOS, false for Windows/Linux/Android.
 * Returns null during SSR to avoid hydration mismatch.
 */
export function useIsMacPlatform(): boolean | null {
  const [isMac, setIsMac] = useState<boolean | null>(null);

  useEffect(() => {
    // Check using modern userAgentData if available
    const platform =
      // @ts-expect-error - userAgentData is not in all browsers yet
      navigator.userAgentData?.platform || navigator.platform || "";

    const isMacLike =
      /mac|iphone|ipad|ipod/i.test(platform) ||
      // Fallback to userAgent for older browsers
      /mac|iphone|ipad|ipod/i.test(navigator.userAgent);

    startTransition(() => {
      setIsMac(isMacLike);
    });
  }, []);

  return isMac;
}

/**
 * Returns the appropriate modifier key symbol/text for the current platform.
 * Returns "⌘" for macOS/iOS, "Ctrl" for Windows/Linux/Android.
 * Returns "⌘" as default during SSR.
 */
export function useModifierKey(): string {
  const isMac = useIsMacPlatform();
  // Default to Ctrl during SSR, then update on client
  return isMac === null ? "Ctrl" : isMac ? "Cmd" : "Ctrl";
}
