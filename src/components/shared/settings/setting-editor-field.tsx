"use client";

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type SettingType =
  | "string"
  | "text"
  | "boolean"
  | "number"
  | "json"
  | "image"
  | "select"
  | "color"
  | "email";

export type SettingOption = string | { value: string; label: string };

interface SettingEditorFieldProps {
  settingKey: string;
  type: SettingType | string;
  value: string;
  label?: string;
  description?: string;
  options?: readonly SettingOption[];
  booleanValue?: boolean;
  onChange: (value: string) => void;
  onBooleanChange?: (value: boolean) => void;
  onFileSelect?: (file: File | null) => void;
  /**
   * If true, shows the field label and description
   */
  showLabel?: boolean;
}

/**
 * Renders the appropriate input field for editing a setting based on its type.
 * Supports: string, text, email, number, boolean, select, color, image, json
 */
export function SettingEditorField({
  settingKey,
  type,
  value,
  label,
  description,
  options,
  booleanValue,
  onChange,
  onBooleanChange,
  onFileSelect,
  showLabel = false,
}: SettingEditorFieldProps) {
  const inputId = `setting-${settingKey}`;

  const renderInput = () => {
    switch (type) {
      case "boolean":
        return (
          <div className="flex items-center gap-space-md">
            <Switch
              id={inputId}
              checked={booleanValue ?? value === "true"}
              onCheckedChange={(checked) => {
                onBooleanChange?.(checked);
                onChange(checked.toString());
              }}
            />
            <span className="text-sm text-muted-foreground">
              {(booleanValue ?? value === "true") ? "Enabled" : "Disabled"}
            </span>
          </div>
        );

      case "select":
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={inputId} className="w-full">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => {
                const optValue = typeof option === "string" ? option : option.value;
                const optLabel = typeof option === "string" ? option : option.label;
                return (
                  <SelectItem key={optValue} value={optValue}>
                    {optLabel}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        );

      case "color":
        return (
          <div className="flex gap-space-sm items-center">
            <input
              type="color"
              id={inputId}
              value={value || "#000000"}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-14 rounded border border-input cursor-pointer bg-transparent"
            />
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#6366f1"
              className="font-mono flex-1"
            />
          </div>
        );

      case "email":
        return (
          <Input
            id={inputId}
            type="email"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="email@example.com"
          />
        );

      case "number":
        return (
          <Input
            id={inputId}
            type="number"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "json":
      case "text":
        return (
          <Textarea
            id={inputId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter value"
            rows={type === "json" ? 6 : 3}
            className={type === "json" ? "font-mono text-sm" : ""}
          />
        );

      case "image":
        return (
          <div className="space-y-space-md">
            {value && (
              <div className="relative w-32 h-32 rounded overflow-hidden border">
                {/* Native img for dynamic setting values (may be data URLs or external URLs) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="Current" className="w-full h-full object-cover" />
              </div>
            )}
            <Input
              id={inputId}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                onFileSelect?.(file);
              }}
            />
          </div>
        );

      default:
        // Default to string input
        return (
          <Input
            id={inputId}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter value"
          />
        );
    }
  };

  if (showLabel && label) {
    return (
      <Field>
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        {renderInput()}
        {description && <FieldDescription>{description}</FieldDescription>}
      </Field>
    );
  }

  return renderInput();
}
