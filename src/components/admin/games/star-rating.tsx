import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

/**
 * Star rating component for game ratings
 * Supports interactive and readonly modes
 */
export function StarRating({ rating, onChange, readonly = false, size = "md" }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const starSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  const displayRating = hoverRating || rating;

  return (
    <div
      className="flex gap-space-xs"
      onMouseLeave={() => !readonly && setHoverRating(0)}
      role={readonly ? undefined : "slider"}
      aria-valuenow={rating}
      aria-valuemin={0}
      aria-valuemax={5}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star === rating ? 0 : star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110",
          )}
        >
          <Star
            className={cn(
              starSize,
              "transition-colors",
              star <= displayRating
                ? "fill-warning text-warning"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
