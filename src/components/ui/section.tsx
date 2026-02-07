import * as React from "react";
import { cn } from "@/lib/utils";

function Section({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="section" className={cn("flex flex-col gap-space-sm", className)} {...props} />
  );
}

function SectionHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        "@container/section-header px-space-sm grid auto-rows-min grid-rows-[auto_auto] items-start gap-space-xs has-data-[slot=section-action]:grid-cols-[1fr_auto] [.border-b]:pb-section",
        className,
      )}
      {...props}
    />
  );
}

function SectionTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-title"
      className={cn("leading-none font-semibold text-lg", className)}
      {...props}
    />
  );
}

function SectionDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function SectionAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function SectionContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="section-content" className={cn("space-y-section", className)} {...props} />
  );
}

function SectionFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="section-footer"
      className={cn("flex items-center px-card [.border-t]:pt-section", className)}
      {...props}
    />
  );
}

export {
  Section,
  SectionAction,
  SectionContent,
  SectionDescription,
  SectionFooter,
  SectionHeader,
  SectionTitle,
};
