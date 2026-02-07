"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface ThemeToggleButtonProps {
  theme?: "light" | "dark";
  showLabel?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Theme Toggle Button (Presentational Component)
 *
 * Simple button for toggling theme with icon and optional label.
 * Animation logic is handled by parent component using useThemeTransition hook.
 */
export const ThemeToggleButton = ({
  theme = "light",
  showLabel = false,
  className,
  onClick,
}: ThemeToggleButtonProps) => {
  return (
    <Button
      onClick={onClick}
      size="sm"
      variant="outline"
      className={cn("relative overflow-hidden transition-all", showLabel && "gap-space-sm", className)}
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="h-[1.2rem] w-[1.2rem]" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem]" />
      )}
      {showLabel && <span className="text-sm">{theme === "light" ? "Light" : "Dark"}</span>}
    </Button>
  );
};
