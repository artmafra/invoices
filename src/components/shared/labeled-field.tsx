"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LabeledFieldProps {
  /** The label to display above the value */
  label: string;
  /** The content/value to display */
  children: ReactNode;
  /** Optional additional class name */
  className?: string;
}

/**
 * A consistent field display component with uppercase label and bordered value.
 * Used in detail views like activity logs, login history, and session cards.
 */
export function LabeledField({ label, children, className }: LabeledFieldProps) {
  return (
    <div className={cn("flex flex-col gap-space-sm", className)}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="text-sm pl-space-sm border-l-2 border-muted">{children}</div>
    </div>
  );
}

export interface LabeledFieldGroupProps {
  /** The fields to group together */
  children: ReactNode;
  /** Optional additional class name */
  className?: string;
}

/**
 * A container component for grouping multiple LabeledField components together
 * with consistent vertical spacing that respects density settings.
 */
export function LabeledFieldGroup({ children, className }: LabeledFieldGroupProps) {
  return <div className={cn("space-y-space-lg", className)}>{children}</div>;
}
