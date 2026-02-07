"use client";

import type { ComponentType, ErrorInfo, ReactNode } from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  /** Custom fallback component */
  fallback: ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

/**
 * Reusable error boundary wrapper component.
 * Catches React component errors and displays fallback UI with retry functionality.
 * Logs errors to console for debugging.
 *
 * Usage for admin pages:
 * ```tsx
 * <ErrorBoundary fallback={AdminErrorFallback}>
 *   <YourAdminPageContent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary({ children, onReset, fallback }: ErrorBoundaryProps) {
  const handleError = (error: Error, info: ErrorInfo) => {
    // Log to console (add Sentry/LogRocket integration here if needed)
    console.error("Error Boundary caught an error:", error, info);
  };

  const handleReset = () => {
    // Call optional reset handler
    onReset?.();
    // Optionally clear any local state or caches here
  };

  return (
    <ReactErrorBoundary FallbackComponent={fallback} onError={handleError} onReset={handleReset}>
      {children}
    </ReactErrorBoundary>
  );
}
