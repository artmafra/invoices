/**
 * Theme Transition Utility
 *
 * Centralized theme switching animation system using View Transitions API.
 * Provides consistent animated theme changes across command palette,
 * preferences page, and theme toggle buttons.
 *
 * Default animation: fade crossfade (0.3s)
 */

import type { DocumentWithViewTransition } from "@/types/api";

// =============================================================================
// Types
// =============================================================================

export type AnimationVariant = "fade";

export interface ThemeTransitionOptions {
  /** Animation variant to use (default: "fade") */
  variant?: AnimationVariant;
}

// =============================================================================
// Animation CSS Generator
// =============================================================================

/**
 * Generate CSS animation styles for fade transition
 */
function generateAnimationCSS(): string {
  return `
    @supports (view-transition-name: root) {
      ::view-transition-old(root) {
        animation: fade-out 0.3s ease-out forwards;
      }
      ::view-transition-new(root) {
        animation: fade-in 0.3s ease-out forwards;
      }
      @keyframes fade-out {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
      @keyframes fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    }
  `;
}

// =============================================================================
// Core Transition Function
// =============================================================================

/**
 * Switch theme with animated transition using View Transitions API
 *
 * @param updateFn - Function that performs the theme change (e.g., setTheme("dark"))
 *
 * @example
 * // Basic usage
 * switchThemeWithAnimation(() => setTheme("dark"));
 */
export function switchThemeWithAnimation(updateFn: () => void): void {
  // Generate animation CSS
  const css = generateAnimationCSS();

  // Inject animation styles if custom CSS is provided
  if (css) {
    const styleId = `theme-transition-${Date.now()}`;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);

    // Clean up animation styles after transition completes
    setTimeout(() => {
      const styleEl = document.getElementById(styleId);
      if (styleEl) {
        styleEl.remove();
      }
    }, 3000);
  }

  // Execute theme change with View Transition API
  if ("startViewTransition" in document) {
    (document as DocumentWithViewTransition).startViewTransition?.(updateFn);
  } else {
    // Fallback for browsers without View Transition API support
    updateFn();
  }
}
