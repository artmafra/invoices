"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/admin/use-users";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface UserSelectProps {
  value: string | null;
  onChange: (userId: string | null) => void;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
}

export function UserSelect({
  value,
  onChange,
  label,
  placeholder,
  description,
  disabled = false,
}: UserSelectProps) {
  const t = useTranslations("common.components.userSelect");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: usersResponse } = useUsers({
    search: debouncedSearch || undefined,
    status: "active",
    limit: 50,
  });

  const users = usersResponse?.users ?? [];
  const selectedUser = users.find((user) => user.id === value);

  return (
    <div className="space-y-space-sm">
      {label && <Label>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="select"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full justify-between", !value && "text-muted-foreground")}
          >
            <div className="flex items-center gap-space-sm truncate">
              <User className="h-4 w-4 shrink-0" />
              {selectedUser ? (
                <span className="truncate">{selectedUser.name || selectedUser.email}</span>
              ) : (
                <span>{placeholder || t("placeholder")}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-space-sm h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
          <Command>
            <CommandInput placeholder={t("search")} value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>{t("noResults")}</CommandEmpty>
              <CommandGroup>
                {value && (
                  <CommandItem
                    value="none"
                    onSelect={() => {
                      onChange(null);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-space-sm h-4 w-4", !value ? "opacity-100" : "opacity-0")}
                    />
                    {t("none")}
                  </CommandItem>
                )}
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={`${user.name || ""} ${user.email}`}
                    keywords={[user.id]}
                    onSelect={() => {
                      onChange(value === user.id ? null : user.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-space-sm h-4 w-4",
                        value === user.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{user.name || user.email}</span>
                      {user.name && (
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
