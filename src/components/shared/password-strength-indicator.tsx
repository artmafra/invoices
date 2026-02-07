"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { useTranslations } from "next-intl";
import { getStrengthColor, getStrengthLabelKey } from "@/lib/password-policy";
import { cn } from "@/lib/utils";
import { type TranslatedPasswordValidationResult } from "@/hooks/public/use-password-policy";

interface PasswordStrengthIndicatorProps {
  validation: TranslatedPasswordValidationResult | null;
  showErrors?: boolean;
  className?: string;
}

/**
 * Password Strength Indicator Component
 *
 * Displays a visual strength meter and validation errors for password input.
 * Uses the password policy validation result to show strength and requirements.
 */
export function PasswordStrengthIndicator({
  validation,
  showErrors = true,
  className,
}: PasswordStrengthIndicatorProps) {
  const t = useTranslations("errors");

  if (!validation) return null;

  const { strength, errors } = validation;
  const strengthLabelKey = getStrengthLabelKey(strength);
  const strengthLabel = t(strengthLabelKey);
  const strengthColor = getStrengthColor(strength);

  // Calculate progress percentage (0-4 maps to 0-100)
  const progressValue = ((strength + 1) / 5) * 100;

  return (
    <div className={cn("space-y-space-sm", className)}>
      {/* Strength meter */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("passwordStrength.label")}</span>
          <span
            className={cn("font-medium", {
              "text-destructive": strength === 0,
              "text-warning": strength === 1 || strength === 2,
              "text-success": strength === 3 || strength === 4,
            })}
          >
            {strengthLabel}
          </span>
        </div>
        <ProgressPrimitive.Root
          className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
          value={progressValue}
        >
          <ProgressPrimitive.Indicator
            className={cn("h-full w-full flex-1 transition-all duration-300", strengthColor)}
            style={{ transform: `translateX(-${100 - progressValue}%)` }}
          />
        </ProgressPrimitive.Root>
      </div>

      {/* Validation errors */}
      {showErrors && errors.length > 0 && (
        <ul className="space-y-space-xs">
          {errors.map((error, index) => (
            <li key={index} className="flex items-start gap-space-sm text-xs text-destructive">
              <span className="mt-space-xs shrink-0">•</span>
              <span>{error}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
