import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground bg-input dark:bg-input border flex w-full min-w-0 rounded-md shadow-xs transition-all duration-200 outline-none file:inline-flex file:border-0 file:bg-transparent file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      size: {
        sm: "h-[calc(2rem*var(--density-multiplier))] px-[calc(var(--spacing-input-x)*0.75)] py-[calc(var(--spacing-input-y)*0.75)] text-sm file:h-[calc(1.5rem*var(--density-multiplier))] file:text-xs",
        default:
          "h-[calc(2.25rem*var(--density-multiplier))] px-[var(--spacing-input-x)] py-[var(--spacing-input-y)] text-sm file:h-[calc(1.75rem*var(--density-multiplier))] file:text-sm",
        lg: "h-[calc(2.5rem*var(--density-multiplier))] px-[calc(var(--spacing-input-x)*1.25)] py-[calc(var(--spacing-input-y)*1.25)] text-base file:h-[calc(2rem*var(--density-multiplier))] file:text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

function Input({
  className,
  type,
  size,
  ...props
}: React.ComponentProps<"input"> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
