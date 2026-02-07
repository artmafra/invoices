import type { ReactNode } from "react";
import { Text } from "@react-email/components";

interface EmailTextProps {
  children: ReactNode;
  className?: string;
  muted?: boolean;
  small?: boolean;
  center?: boolean;
}

/**
 * Consistent text styling for email templates.
 */
export function EmailText({
  children,
  className = "",
  muted = false,
  small = false,
  center = false,
}: EmailTextProps) {
  const baseClasses = "leading-relaxed";
  const colorClass = muted ? "text-gray-500" : "text-gray-600";
  const sizeClass = small ? "text-sm" : "text-base";
  const alignClass = center ? "text-center" : "";

  return (
    <Text className={`${baseClasses} ${colorClass} ${sizeClass} ${alignClass} ${className}`}>
      {children}
    </Text>
  );
}
