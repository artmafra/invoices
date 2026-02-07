"use client";

import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface TextSettingProps {
  settingId: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}

export function TextSetting({ settingId, value, onChange }: TextSettingProps) {
  return (
    <FieldGroup className="w-full md:max-w-sm">
      <Field>
        <Input
          id={`value-${settingId}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter setting value"
        />
      </Field>
    </FieldGroup>
  );
}
