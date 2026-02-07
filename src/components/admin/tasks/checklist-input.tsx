"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ChecklistItem } from "@/validations/task.validations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface ChecklistInputProps {
  value: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  maxItems?: number;
}

export function ChecklistInput({ value, onChange, maxItems = 20 }: ChecklistInputProps) {
  const t = useTranslations("apps/tasks");
  const [inputText, setInputText] = useState("");

  const addItem = () => {
    const trimmed = inputText.trim();
    if (!trimmed || value.length >= maxItems) return;

    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: trimmed,
      checked: false,
    };

    onChange([...value, newItem]);
    setInputText("");
  };

  const removeItem = (id: string) => {
    onChange(value.filter((item) => item.id !== id));
  };

  const toggleItem = (id: string) => {
    onChange(value.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)));
  };

  const updateItemText = (id: string, text: string) => {
    onChange(value.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputText.trim()) {
      e.preventDefault();
      addItem();
    }
  };

  const checkedCount = value.filter((item) => item.checked).length;
  const totalCount = value.length;
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-space-sm">
      <div className="flex items-center justify-between">
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {checkedCount}/{totalCount} {t("checklist.completed")}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Checklist items */}
      {value.length > 0 && (
        <div className="space-y-space-sm">
          {value.map((item) => (
            <div key={item.id} className="flex items-center gap-space-sm group">
              <div className="relative flex-1">
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10"
                />
                <Input
                  value={item.text}
                  onChange={(e) => updateItemText(item.id, e.target.value)}
                  className={`pl-10 ${item.checked ? "line-through text-muted-foreground" : ""}`}
                  placeholder={t("checklist.itemPlaceholder")}
                />
              </div>
              <Button
                type="button"
                variant="link"
                size="icon"
                onClick={() => removeItem(item.id)}
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new item */}
      {value.length < maxItems && (
        <div className="flex gap-space-sm">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("checklist.addPlaceholder")}
            maxLength={500}
          />
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={addItem}
            disabled={!inputText.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {value.length >= maxItems && (
        <p className="text-xs text-muted-foreground">{t("checklist.maxReached")}</p>
      )}

      <p className="text-xs text-muted-foreground">{t("fields.checklistDescription")}</p>
    </div>
  );
}
