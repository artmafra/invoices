import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorAlertProps {
  message: string;
  className?: string;
}

/**
 * Error alert component with consistent styling and dark mode support.
 * Use for displaying error messages in forms and pages.
 */
export function ErrorAlert({ message, className }: ErrorAlertProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-space-md rounded-md border bg-destructive/10 border-destructive/20 p-space-lg",
        className,
      )}
    >
      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-space-xs" />
      <div className="text-sm text-destructive">{message}</div>
    </div>
  );
}
