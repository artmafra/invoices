"use client";

import { useTranslations } from "next-intl";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface TextSettingProps {
  settingId: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

export function TextSetting({ settingId, value, onChange }: TextSettingProps) {
  const t = useTranslations("system.settings");

  return (
    <FieldGroup className="w-full md:max-w-sm">
      <Field>
        <Input
          id={`value-${settingId}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("form.enterValue")}
        />
      </Field>
    </FieldGroup>
  );
}
