"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

function Switch({
  className,
  checked,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const ThumbIcon = checked ? Check : X;

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={checked}
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[state=unchecked]:bg-input/80 inline-flex shrink-0 items-center rounded-full border shadow-xs transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        "h-[calc(1.6rem*var(--density-multiplier))] w-[calc(2.5rem*var(--density-multiplier))]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "data-[state=unchecked]:bg-primary data-[state=checked]:bg-background dark:data-[state=unchecked]:bg-foreground dark:data-[state=checked]:bg-primary-foreground pointer-events-none flex items-center justify-center rounded-full ring-0 transition-transform",
          "size-[calc(1rem*var(--density-multiplier))]",
          "data-[state=checked]:translate-x-[calc(2.7rem*var(--density-multiplier)-1rem*var(--density-multiplier)-0.5rem)] data-[state=unchecked]:translate-x-1",
        )}
      >
        <ThumbIcon
          className="text-primary size-[calc(0.75rem*var(--density-multiplier))]"
          strokeWidth={3}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
