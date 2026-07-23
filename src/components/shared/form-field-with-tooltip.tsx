"use client";

import { ReactNode } from "react";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface FormFieldWithTooltipProps {
  label: string;
  error?: string;
  isTouched: boolean;
  children: ReactNode;
  className?: string;
  required?: boolean;
}

/**
 * Wrapper for form fields that displays validation errors as tooltips.
 * Shows tooltip when field is touched (blurred) and has an error.
 */
export function FormFieldWithTooltip({
  label,
  error,
  isTouched,
  children,
  className,
  required = false,
}: FormFieldWithTooltipProps) {
  const shouldShowError = isTouched && !!error;

  return (
    <FormItem>
      <FormLabel>
        {label}
        {required && <span className="text-destructive ml-space-xs">*</span>}
      </FormLabel>
      <Tooltip open={shouldShowError}>
        <TooltipTrigger asChild>
          <div className={className}>
            <FormControl>{children}</FormControl>
          </div>
        </TooltipTrigger>
        {shouldShowError && <TooltipContent side="top">{error}</TooltipContent>}
      </Tooltip>
    </FormItem>
  );
}
