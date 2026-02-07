"use client";

import { ArrowRight, Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ActivityChange } from "@/types/common/activity.types";
import { formatValue, isImageUrl } from "@/lib/activity/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyImagePlaceholder, ImageThumbnail } from "./image-components";

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

/**
 * Render a formatted value with special styling for empty strings
 */
function FormattedValue({ value }: { value: ReturnType<typeof formatValue> }) {
  const t = useTranslations("system.activity");

  if (typeof value === "object" && value.empty) {
    return <span className="italic text-muted-foreground">{t("fields.emptyValue")}</span>;
  }
  return <>{value}</>;
}

interface ChangeItemProps {
  change: ActivityChange;
}

/**
 * Render a single change item showing field changes
 */
export function ChangeItem({ change }: ChangeItemProps) {
  const fieldLabel = useFieldLabel(change.field);

  // Handle password field specially
  if (change.field === "password") {
    return (
      <div className="text-sm flex items-center gap-space-sm">
        <span className="text-muted-foreground">{fieldLabel}:</span>
        <code className="bg-muted px-space-xs py-space-xs rounded text-xs">••••••••</code>
      </div>
    );
  }

  // Handle added/removed arrays (e.g., permissions)
  if (change.added || change.removed) {
    return (
      <div className="text-sm space-y-space-xs">
        <span className="text-muted-foreground">{fieldLabel}:</span>
        {change.added && change.added.length > 0 && (
          <div className="flex flex-wrap gap-space-xs mt-space-xs">
            {change.added.map((item, i) => (
              <Badge key={i} variant="success" className="text-[10px] gap-space-xs">
                <Plus className="h-2.5 w-2.5" />
                {item}
              </Badge>
            ))}
          </div>
        )}
        {change.removed && change.removed.length > 0 && (
          <div className="flex flex-wrap gap-space-xs mt-space-xs">
            {change.removed.map((item, i) => (
              <Badge key={i} variant="destructive" className="text-[10px] gap-space-xs">
                <Minus className="h-2.5 w-2.5" />
                {item}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle image URL changes (detect by checking if from/to are image URLs)
  const fromIsImage = isImageUrl(change.from);
  const toIsImage = isImageUrl(change.to);
  const fromIsEmpty = change.from === null || change.from === undefined || change.from === "";
  const toIsEmpty = change.to === null || change.to === undefined || change.to === "";

  // If either value is an image URL, or we're transitioning from/to empty with an image
  if (fromIsImage || toIsImage || (fromIsEmpty && toIsImage) || (fromIsImage && toIsEmpty)) {
    return (
      <div className="text-sm space-y-space-sm">
        <span className="text-muted-foreground">{fieldLabel}:</span>
        <div className="flex items-center gap-space-md">
          {/* From: either image thumbnail or empty placeholder */}
          {fromIsImage ? <ImageThumbnail url={change.from as string} /> : <EmptyImagePlaceholder />}
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          {/* To: either image thumbnail or empty placeholder */}
          {toIsImage ? <ImageThumbnail url={change.to as string} /> : <EmptyImagePlaceholder />}
        </div>
      </div>
    );
  }

  // Handle from/to value changes
  return (
    <div className="text-sm flex items-center gap-space-sm flex-wrap">
      <span className="text-muted-foreground">{fieldLabel}:</span>
      <code className="bg-muted px-space-xs py-space-xs rounded text-xs text-destructive">
        <FormattedValue value={formatValue(change.from)} />
      </code>
      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
      <code className="bg-muted px-space-xs py-space-xs rounded text-xs text-success">
        <FormattedValue value={formatValue(change.to)} />
      </code>
    </div>
  );
}
