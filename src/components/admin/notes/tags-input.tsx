"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTags } from "@/hooks/admin/use-notes";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
}

export function TagsInput({ value, onChange, maxTags = 5 }: TagsInputProps) {
  const t = useTranslations("apps/notes");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { data: suggestions = [] } = useTags(searchTerm, 10);
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setSearchTerm("");
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchTerm.trim()) {
      e.preventDefault();
      addTag(searchTerm);
    } else if (e.key === "Enter") {
      e.preventDefault();
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setSearchTerm("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setShowSuggestions(newValue.trim().length > 0);
  };

  const filteredSuggestions = suggestions.filter((tag) => !value.includes(tag.name));
  const hasSuggestions = filteredSuggestions.length > 0;

  return (
    <div className="space-y-space-sm">
      <Label>{t("fields.tags")}</Label>
      <div className="space-y-space-sm">
        {/* Tag input with inline tags */}
        <div className="relative">
          <div className="flex min-h-10 w-full flex-wrap gap-space-xs rounded-md border bg-background px-input-x py-input-y text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive">
            {/* Display selected tags inline */}
            {value.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="gap-space-xs h-6 cursor-pointer"
                onClick={() => removeTag(tag)}
              >
                {tag}
                <X className="h-3 w-3" />
              </Badge>
            ))}

            {/* Input field */}
            {value.length < maxTags && (
              <input
                ref={inputRef}
                type="text"
                placeholder={value.length === 0 ? t("fields.tagsPlaceholder") : ""}
                value={searchTerm}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(searchTerm.trim().length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-30"
              />
            )}
          </div>

          {/* Autocomplete suggestions */}
          {showSuggestions && hasSuggestions && (
            <div className="absolute top-full left-0 right-0 z-10 mt-space-xs rounded-md border bg-popover text-popover-foreground shadow-md">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {filteredSuggestions.map((tag) => (
                      <CommandItem key={tag.id} value={tag.name} onSelect={() => addTag(tag.name)}>
                        {tag.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          )}
        </div>

        {value.length >= maxTags && (
          <p className="text-xs text-muted-foreground">{t("tags.maxReached")}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{t("fields.tagsDescription")}</p>
    </div>
  );
}
