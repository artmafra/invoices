"use client";

import Image from "next/image";
import { ImageOff } from "lucide-react";

interface EmptyImagePlaceholderProps {
  size?: number;
}

/**
 * Empty image placeholder component with dashed border
 */
export function EmptyImagePlaceholder({ size = 48 }: EmptyImagePlaceholderProps) {
  return (
    <div
      className="flex items-center justify-center rounded border-2 border-dashed border-muted-foreground/30 bg-muted/50"
      style={{ width: size, height: size }}
    >
      <ImageOff className="h-5 w-5 text-muted-foreground/50" />
    </div>
  );
}

interface ImageThumbnailProps {
  url: string;
  size?: number;
}

/**
 * Image thumbnail component for activity changes
 */
export function ImageThumbnail({ url, size = 128 }: ImageThumbnailProps) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group relative inline-block">
      <Image
        src={url}
        alt="Changed image"
        width={size}
        height={size}
        className="rounded border bg-muted object-cover transition-opacity group-hover:opacity-80"
        unoptimized
      />
    </a>
  );
}
