"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type AvatarProps = React.HTMLAttributes<HTMLDivElement>;

function Avatar({ className, ...props }: AvatarProps) {
  return (
    <div
      data-slot="avatar"
      className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
}

type AvatarImageProps = Omit<React.ComponentProps<typeof Image>, "fill" | "src"> & {
  src?: string | null;
};

function AvatarImage({ className, src, alt, ...props }: AvatarImageProps) {
  const [hasError, setHasError] = React.useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return null;
  }

  return (
    <Image
      data-slot="avatar-image"
      src={src}
      alt={alt ?? ""}
      fill
      onError={() => setHasError(true)}
      className={cn("relative z-10 object-cover", className)}
      {...props}
    />
  );
}

type AvatarFallbackProps = React.HTMLAttributes<HTMLSpanElement>;

function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <span
      data-slot="avatar-fallback"
      className={cn(
        "bg-primary/10 text-primary absolute inset-0 z-0 flex size-full items-center justify-center rounded-full font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
