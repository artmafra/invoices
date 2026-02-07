/**
 * Icon Map Utility
 *
 * Provides a curated map of Lucide icons used throughout the application.
 * This avoids importing the entire lucide-react library (`import * as icons`)
 * which prevents tree-shaking and adds ~500KB+ to the bundle.
 *
 * When adding a new icon:
 * 1. Import it from lucide-react
 * 2. Add it to the ICON_MAP with the exact same key as the export name
 */

import {
  Activity,
  CheckSquare,
  FileText,
  Home,
  Monitor,
  Moon,
  Package,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  StickyNote,
  Sun,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Map of icon names to their components.
 * Keys must match the exact export name from lucide-react.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  CheckSquare,
  FileText,
  Home,
  Monitor,
  Moon,
  Package,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  Sliders,
  StickyNote,
  Sun,
  User,
  Users,
  Wrench,
};

/**
 * Get a Lucide icon component by name.
 * Returns Package icon as fallback if the icon is not found.
 *
 * @param name - The exact name of the icon (e.g., "StickyNote", "CheckSquare")
 * @returns The icon component or Package as fallback
 */
export function getIconByName(name: string): LucideIcon {
  return ICON_MAP[name] ?? Package;
}
