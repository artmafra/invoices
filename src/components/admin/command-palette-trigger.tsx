"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useModifierKey } from "@/hooks/use-platform";
import { useCommandPalette } from "@/components/admin/command-palette-provider";
import { Button } from "@/components/ui/button";

/**
 * Button that opens the command palette.
 * Shows keyboard shortcut hint on hover.
 */
export function CommandPaletteTrigger() {
  const { setOpen } = useCommandPalette();
  const modifierKey = useModifierKey();
  const t = useTranslations("admin.commandPalette");

  return (
    <Button
      variant="select"
      size="sm"
      className="cursor-pointer relative h-[calc(2.25rem*var(--density-multiplier))] w-full justify-start gap-space-md text-sm"
      onClick={() => setOpen(true)}
    >
      <Search className="size-4" />
      <span className="flex-1 text-left font-normal">{t("search")}</span>
      <kbd
        className="pointer-events-none hidden h-[calc(1.25rem*var(--density-multiplier))] select-none items-center gap-space-xs rounded border bg-muted px-space-sm font-mono text-[10px] font-medium opacity-100 sm:flex transition-all duration-200"
        suppressHydrationWarning
      >
        <span className="text-xs">{modifierKey} K</span>
      </kbd>
    </Button>
  );
}
