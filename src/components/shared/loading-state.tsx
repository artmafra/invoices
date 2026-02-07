import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
}

/**
 * Loading state component for data loading scenarios.
 * Shows a spinner with optional message.
 * Use for initial page loads, inline loading (search results), or any async operation.
 */
export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex justify-center items-center py-space-xl" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="ml-space-sm text-muted-foreground">{message}</span>
    </div>
  );
}
