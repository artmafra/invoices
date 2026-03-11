"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useServices } from "@/hooks/admin/use-services";
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

interface ServiceSelectProps {
  value: string | null;
  onChange: (serviceCode: string | null) => void;
  onBlur?: () => void;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
}

export function ServiceSelect({
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  description,
  disabled = false,
}: ServiceSelectProps) {
  const t = useTranslations("common.components.serviceSelect");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: services } = useServices({
    search: debouncedSearch || undefined,
  });

  const selectedService = services?.find((service) => service.code === value);

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
            onBlur={onBlur}
            className={cn("w-full justify-between", !value && "text-muted-foreground")}
          >
            <div className="flex items-center gap-space-sm truncate">
              <FileText className="h-4 w-4 shrink-0" />
              {selectedService ? (
                <span className="truncate">{selectedService.code}</span>
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
                {services?.map((service) => (
                  <CommandItem
                    key={service.id}
                    value={`${service.code} ${service.description}`}
                    keywords={[service.id, service.code]}
                    onSelect={() => {
                      onChange(value === service.code ? null : service.code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-space-sm h-4 w-4",
                        value === service.code ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{service.code}</span>
                      <span className="text-xs text-muted-foreground">{service.description}</span>
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
