/**
 * UI Configuration
 *
 * Centralized configuration for UI system including density modes,
 * spacing scales, and component defaults.
 */

export type Density = "compact" | "comfortable" | "spacious";

/**
 * Density scale configuration
 * These multipliers are applied to spacing tokens via CSS custom properties
 */
export const DENSITY_SCALE = {
  compact: 0.75,
  comfortable: 1,
  spacious: 1.25,
} as const;

/**
 * Density cycle order for keyboard shortcuts
 */
export const DENSITY_CYCLE: Density[] = ["compact", "comfortable", "spacious"];

/**
 * Default density mode
 * Note: This can be overridden by localStorage (`ui-density`)
 */
export const DEFAULT_DENSITY: Density = "comfortable";

/**
 * UI configuration object
 */
export const uiConfig = {
  density: {
    default: DEFAULT_DENSITY,
    scale: DENSITY_SCALE,
    cycle: DENSITY_CYCLE,
  },
} as const;
