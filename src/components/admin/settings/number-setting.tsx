"use client";

import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface NumberSettingProps {
  settingId: string;
  value: string;
  onChange: (value: string) => void;
}

export function NumberSetting({ settingId, value, onChange }: NumberSettingProps) {
  return (
    <FieldGroup className="w-full md:max-w-sm">
      <Field>
        <Input
          id={`value-${settingId}`}
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter number"
        />
      </Field>
    </FieldGroup>
  );
}
