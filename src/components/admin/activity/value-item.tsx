"use client";

import { useTranslations } from "next-intl";
import { isImageUrl } from "@/lib/activity/utils";
import { Badge } from "@/components/ui/badge";
import { ImageThumbnail } from "./image-components";

/**
 * Convert field name to translation key
 * e.g., "preferences.theme" -> "preferencesTheme"
 */
function fieldToTranslationKey(field: string): string {
  return field
    .split(".")
    .map((part, index) => {
      const camelPart = part.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      return index === 0 ? camelPart : camelPart.charAt(0).toUpperCase() + camelPart.slice(1);
    })
    .join("");
}

/**
 * Get translated field label with fallback to capitalized raw field name
 */
function useFieldLabel(field: string) {
  const t = useTranslations("system.activity");

  // Handle dynamic app permission fields (e.g., "apps.notes" -> "App: Notes")
  if (field.startsWith("apps.")) {
    const appName = field.replace("apps.", "");
    // Capitalize first letter
    const formattedName = appName.charAt(0).toUpperCase() + appName.slice(1);
    return t("fields.apps", { name: formattedName });
  }

  // Convert field to translation key and check for translation
  const translationKey = fieldToTranslationKey(field);
  const fieldKey = `fields.${translationKey}`;
  if (t.has(fieldKey)) {
    return t(fieldKey);
  }

  // Fallback: capitalize and format the raw field name
  return field
    .replace(/([A-Z])/g, " $1")
    .replace(/[._]/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface ValueItemProps {
  field: string;
  value: unknown;
}

/**
 * Render a single value item (for create actions) - similar to ChangeItem but only shows new value
 */
export function ValueItem({ field, value }: ValueItemProps) {
  const t = useTranslations("system.activity");
  const tCommon = useTranslations("common");
  const fieldLabel = useFieldLabel(field);

  // Handle password field specially
  if (field === "password") {
    return (
      <div className="text-sm flex items-center gap-space-sm">
        <span>{fieldLabel}:</span>
        <code className="bg-muted px-space-xs py-space-xs rounded text-xs">••••••••</code>
      </div>
    );
  }

  // Handle authMethod field - translate the value
  if (field === "authMethod" && typeof value === "string") {
    const methodKey = `actions.authMethods.${value}` as Parameters<typeof t>[0];
    const translatedMethod = t.has(methodKey) ? t(methodKey) : value;
    return (
      <div className="text-sm flex items-center gap-space-sm">
        <span>{fieldLabel}:</span>
        <code className="bg-muted px-space-xs py-space-xs rounded text-xs text-success">
          {translatedMethod}
        </code>
      </div>
    );
  }

  // Handle arrays (like permissions)
  if (Array.isArray(value)) {
    return (
      <div className="text-sm space-y-space-xs">
        <span>{fieldLabel}:</span>
        {value.length > 0 ? (
          <div className="flex flex-wrap gap-space-xs mt-space-xs">
            {value.map((item, i) => (
              <Badge key={i} variant="success" className="text-[10px] gap-space-xs">
                {String(item)}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs ml-space-xs">{tCommon("values.none")}</span>
        )}
      </div>
    );
  }

  // Handle null/undefined
  if (value === null || value === undefined) {
    return (
      <div className="text-sm flex items-center gap-space-sm">
        <span>{fieldLabel}:</span>
        <span className="text-muted-foreground italic">{t("labels.notSet")}</span>
      </div>
    );
  }

  // Handle booleans
  if (typeof value === "boolean") {
    return (
      <div className="text-sm flex items-center gap-space-sm">
        <span>{fieldLabel}:</span>
        <code className="bg-muted px-space-xs py-space-xs rounded text-xs text-success">
          {value ? tCommon("values.yes") : tCommon("values.no")}
        </code>
      </div>
    );
  }

  // Handle image URLs (profile pictures, etc.)
  if (isImageUrl(value)) {
    return (
      <div className="text-sm space-y-space-xs">
        <span>{fieldLabel}:</span>
        <div className="mt-space-xs">
          <ImageThumbnail url={value} />
        </div>
      </div>
    );
  }

  // Handle strings and numbers
  return (
    <div className="text-sm flex items-center gap-space-sm flex-wrap">
      <span>{fieldLabel}:</span>
      <code className="bg-muted px-space-xs py-space-xs rounded text-xs text-success">{String(value)}</code>
    </div>
  );
}
