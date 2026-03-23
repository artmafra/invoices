"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface BooleanSettingProps {
  settingId: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanSetting({ settingId, value, onChange }: BooleanSettingProps) {
  const t = useTranslations("system.settings");

  return (
    <div className="flex flex-col gap-space-sm">
      <div className="flex items-center gap-space-md py-input-y">
        <Switch id={`value-${settingId}`} checked={value} onCheckedChange={onChange} />
        <Label htmlFor={`value-${settingId}`}>
          {value ? t("form.enabled") : t("form.disabled")}
        </Label>
      </div>
    </div>
  );
}
