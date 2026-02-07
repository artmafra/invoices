"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { type Locale } from "@/i18n/config";
import { Keyboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { formatShortcut, SHORTCUTS } from "@/config/shortcuts.registry";
import { updateLanguageOnServer, usePreferences } from "@/lib/preferences";
import { dispatchCommandAction } from "@/hooks/admin/use-action-from-url";
import { useCommands, type CommandItem as CommandItemType } from "@/hooks/admin/use-commands";
import { useIsMacPlatform } from "@/hooks/use-platform";
import { useThemeTransition } from "@/hooks/use-theme-transition";
import { useCommandPalette } from "@/components/admin/command-palette-provider";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

// =============================================================================
// Component
// =============================================================================

export function CommandPalette() {
  const t = useTranslations("admin.commandPalette");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const { open, setOpen, searchValue, setSearchValue, openCount } = useCommandPalette();
  const { groups } = useCommands();
  const { switchTheme } = useThemeTransition();
  const { setPref } = usePreferences();
  const isMac = useIsMacPlatform();
  const inputRef = useRef<HTMLInputElement>(null);

  // Custom filter function that prioritizes exact label matches
  const customFilter = useCallback((value: string, search: string) => {
    // Value format: "label|keywords"
    const [label, keywords] = value.split("|");
    const labelLower = label?.toLowerCase() || "";
    const keywordsLower = keywords?.toLowerCase() || "";
    const searchLower = search.toLowerCase().trim();

    if (!searchLower) return 1;

    // Helper: Check if search is a subsequence of text (fuzzy match)
    const isSubsequence = (text: string, search: string): boolean => {
      let searchIndex = 0;
      for (let i = 0; i < text.length && searchIndex < search.length; i++) {
        if (text[i] === search[searchIndex]) {
          searchIndex++;
        }
      }
      return searchIndex === search.length;
    };

    // Exact label match = highest priority (use large number for cmdk sorting)
    if (labelLower === searchLower) return 100;

    // Label starts with search = high priority
    if (labelLower.startsWith(searchLower)) return 90;

    // Label contains search = medium priority
    if (labelLower.includes(searchLower)) return 70;

    // Keyword exact match = medium-low priority
    const keywordList = keywordsLower.split(" ");
    if (keywordList.includes(searchLower)) return 50;

    // Keyword contains search = low priority
    if (keywordsLower.includes(searchLower)) return 30;

    // Fuzzy match in label (subsequence) = low priority
    if (isSubsequence(labelLower, searchLower)) return 20;

    // Fuzzy match in keywords (subsequence) = very low priority
    if (isSubsequence(keywordsLower, searchLower)) return 10;

    // No match - filter out
    return 0;
  }, []);

  // Select all text when opening the palette (VS Code behavior)
  useEffect(() => {
    if (open) {
      // Small delay to ensure the dialog has mounted and input is focused
      const timer = setTimeout(() => {
        inputRef.current?.select();
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSelect = useCallback(
    (command: CommandItemType) => {
      setOpen(false);

      if (command.type === "page" && command.href) {
        // Navigate to page
        router.push(command.href);
      } else if (command.type === "action" && command.actionHref && command.actionId) {
        // Extract the action name from actionId (e.g., "users:create" -> "create")
        const actionName = command.actionId.split(":").pop() || "create";

        // Check if already on the target page
        const isOnTargetPage = pathname === command.actionHref;

        if (isOnTargetPage) {
          // Already on page - dispatch event directly (no URL change needed)
          dispatchCommandAction(actionName);
        } else {
          // Navigate to page with action query param
          router.push(`${command.actionHref}?action=${actionName}`);
        }
      } else if (command.type === "function" && command.functionId) {
        // Execute function command
        if (command.functionId.startsWith("theme:")) {
          // Theme commands
          const theme = command.functionId.split(":")[1];
          switchTheme(theme);
        } else if (command.functionId.startsWith("language:")) {
          // Language commands
          const locale = command.functionId.split(":")[1] as Locale;
          setPref("language", locale);
          updateLanguageOnServer(locale)
            .then(() => {
              router.refresh();
            })
            .catch(() => {
              toast.error(tc("errors.saveFailed"));
            });
        } else if (command.functionId.startsWith("density:")) {
          // Density commands
          const density = command.functionId.split(":")[1] as
            | "compact"
            | "comfortable"
            | "spacious";
          setPref("density", density);
        }
      }
    },
    [router, pathname, setOpen, switchTheme, setPref, tc],
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      showCloseButton={false}
      commandKey={openCount}
      filter={customFilter}
    >
      <CommandInput
        ref={inputRef}
        placeholder={t("placeholder")}
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList>
        <CommandEmpty>{t("noResults")}</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group.id} heading={group.label}>
            {group.items.map((command) => (
              <CommandItem
                key={command.id}
                value={`${command.label}|${command.keywords?.join(" ") || ""}`}
                onSelect={() => handleSelect(command)}
              >
                <command.iconComponent className="size-4" />
                <span>{command.label}</span>
                {command.type === "action" && (
                  <CommandShortcut className="text-muted-foreground/60">
                    {t("action")}
                  </CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {/* Keyboard Shortcuts */}
        <CommandGroup heading={t("keyboardShortcuts")}>
          {SHORTCUTS.map((shortcut) => (
            <CommandItem
              key={shortcut.id}
              value={`${shortcut.label} ${shortcut.description} keyboard shortcut hotkey`}
              disabled
            >
              <Keyboard className="size-4" />
              <span>{shortcut.label}</span>
              <CommandShortcut>{formatShortcut(shortcut, isMac ?? false)}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
