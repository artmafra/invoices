"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface VerificationCodeInputProps {
  /** Current value of the input */
  value: string;
  /** Called when value changes (filtered based on inputType) */
  onChange: (value: string) => void;
  /** Called when the user completes entering all characters */
  onComplete?: (value: string) => void;
  /** Maximum number of characters (default: 6) */
  maxLength?: number;
  /** Placeholder text (default: "000000" for numeric, "XXXXXXXX" for alphanumeric) */
  placeholder?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to auto-focus the input */
  autoFocus?: boolean;
  /** Input ID for label association */
  id?: string;
  /** Whether the input has an error */
  error?: boolean;
  /** Additional class names */
  className?: string;
  /** Input type: "numeric" (digits only) or "alphanumeric" (letters and digits) */
  inputType?: "numeric" | "alphanumeric";
}

/**
 * A standardized input component for verification codes (TOTP, 2FA, email verification, backup codes, etc.)
 * - Filters input based on inputType (digits only or alphanumeric)
 * - Uses monospace font for consistent character display
 * - Supports auto-completion callback when all characters are entered
 */
export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  maxLength = 6,
  placeholder,
  disabled = false,
  autoFocus = false,
  id,
  className,
  inputType = "numeric",
}: VerificationCodeInputProps) {
  const previousValueRef = useRef(value);

  // Default placeholder based on input type and length
  const defaultPlaceholder =
    inputType === "numeric" ? "0".repeat(maxLength) : "X".repeat(maxLength);
  const actualPlaceholder = placeholder ?? defaultPlaceholder;

  // Handle completion callback when value reaches maxLength
  useEffect(() => {
    if (onComplete && value.length === maxLength && previousValueRef.current.length !== maxLength) {
      onComplete(value);
    }
    previousValueRef.current = value;
  }, [value, maxLength, onComplete]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let filteredValue: string;

    if (inputType === "numeric") {
      // Filter to digits only
      filteredValue = e.target.value.replace(/\D/g, "").slice(0, maxLength);
    } else {
      // Filter to alphanumeric only and convert to uppercase
      filteredValue = e.target.value
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(0, maxLength);
    }

    onChange(filteredValue);
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode={inputType === "numeric" ? "numeric" : "text"}
      autoComplete="one-time-code"
      maxLength={maxLength}
      placeholder={actualPlaceholder.slice(0, maxLength)}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      autoFocus={autoFocus}
      className={cn("text-center tracking-[0.4em]", className)}
    />
  );
}
