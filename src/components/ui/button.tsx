import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center cursor-pointer gap-[var(--spacing-space-md)] whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        warning:
          "bg-warning text-white hover:bg-warning/90 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40 dark:bg-warning/60 dark:hover:bg-warning/70",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
        select:
          "font-normal data-placeholder:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input dark:hover:bg-input/50 flex w-fit items-center justify-between gap-[var(--spacing-space-md)] rounded-md border bg-transparent px-[var(--spacing-input-x)] py-[var(--spacing-input-y)] text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[calc(2.25rem*var(--density-multiplier))] data-[size=sm]:h-[calc(2rem*var(--density-multiplier))] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-[var(--spacing-space-md)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-default",
      },
      size: {
        default:
          "h-[calc(2.25rem*var(--density-multiplier))] px-[var(--spacing-button-x)] py-[var(--spacing-button-y)] has-[>svg]:px-[calc(var(--spacing-button-x)*0.75)]",
        sm: "h-[calc(2rem*var(--density-multiplier))] rounded-md gap-[var(--spacing-space-sm)] px-[calc(var(--spacing-button-x)*0.75)] has-[>svg]:px-[calc(var(--spacing-button-x)*0.625)]",
        lg: "h-[calc(2.5rem*var(--density-multiplier))] rounded-md px-[calc(var(--spacing-button-x)*1.5)] has-[>svg]:px-[var(--spacing-button-x)]",
        icon: "size-[calc(2.25rem*var(--density-multiplier))]",
        "icon-sm": "size-[calc(2rem*var(--density-multiplier))]",
        "icon-lg": "size-[calc(2.5rem*var(--density-multiplier))]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
