import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-destructive/50 bg-destructive/5 text-destructive [a&]:hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        success: "border-success/50 bg-success/5 text-success [a&]:hover:bg-success/20",
        warning: "border-warning/50 bg-warning/5 text-warning [a&]:hover:bg-warning/20",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
      },
      size: {
        sm: "h-[calc(1.4rem*var(--density-multiplier))] px-[calc(var(--spacing-space-sm)*1.5)] gap-[calc(var(--spacing-space-xs)*1.5)] text-[0.6875rem] [&>svg]:size-[calc(0.6875rem*var(--density-multiplier))]",
        default:
          "h-[calc(1.5rem*var(--density-multiplier))] px-[var(--spacing-space-md)] gap-[var(--spacing-space-xs)] text-xs [&>svg]:size-[calc(0.75rem*var(--density-multiplier))]",
        lg: "h-[calc(1.6rem*var(--density-multiplier))] px-[calc(var(--spacing-space-md)*1.5)] gap-[var(--spacing-space-sm)] text-sm [&>svg]:size-[calc(0.875rem*var(--density-multiplier))]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
