"use client";

import { useTranslations } from "next-intl";
import { FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectSettingProps {
  settingId: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export function SelectSetting({ settingId, value, options, onChange }: SelectSettingProps) {
  const t = useTranslations("system.settings");

  return (
    <FieldGroup className="w-full md:max-w-sm">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={`select-${settingId}`} className="w-full">
          <SelectValue placeholder={t("form.selectOption")} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldGroup>
  );
}
