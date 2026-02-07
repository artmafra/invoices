import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  value?: string | null;
  onChange: (color: string | null) => void;
  colors?: string[];
  disabled?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
];

export function ColorPicker({
  value,
  onChange,
  colors = DEFAULT_COLORS,
  disabled = false,
  className,
}: ColorPickerProps) {
  const selectedColor = value || null;

  return (
    <div className={cn("flex flex-wrap gap-space-sm", className)}>
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-xs outline-none transition-[color,box-shadow,transform]",
            "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            "border-transparent hover:scale-105",
          )}
          style={{ backgroundColor: color }}
          disabled={disabled}
          aria-label={`Select color ${color}`}
        >
          {selectedColor === color && <Check className="h-4 w-4 text-background" strokeWidth={5} />}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground shadow-xs outline-none transition-[color,box-shadow,transform]",
          "focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        )}
        disabled={disabled}
        aria-label="No color"
      >
        {!selectedColor && <Check className="h-4 w-4 text-foreground" strokeWidth={5} />}
      </button>
    </div>
  );
}
