"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TimeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="time"
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-input-x py-input-y text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
TimeInput.displayName = "TimeInput";

export { TimeInput };
