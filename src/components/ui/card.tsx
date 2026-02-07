import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm has-data-[slot=card-footer]:pb-0 has-data-[slot=card-header]:pt-0",
        "gap-space-xl pt-(--spacing-card) pb-(--spacing-card)",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start rounded-t-xl has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        "px-[calc(var(--spacing-card)*0.5)] md:px-[calc(var(--spacing-card)*0.67)] lg:px-(--spacing-card)",
        "pt-(--spacing-card) [.border-b]:pb-(--spacing-card)",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-tight line-clamp-2 font-medium", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("leading-tight line-clamp-2 text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        "px-[calc(var(--spacing-card)*0.5)] md:px-[calc(var(--spacing-card)*0.67)] lg:px-(--spacing-card)",
        className,
      )}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center bg-card-section border-t rounded-b-xl",
        "px-[calc(var(--spacing-card)*0.67)] md:px-(--spacing-card) py-[calc(var(--spacing-card)*0.5)]",
        "gap-space-md",
        className,
      )}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
