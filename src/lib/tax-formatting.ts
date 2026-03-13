export const formatTaxRateForDisplay = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  // Convert to cents and format
  const cents = Math.round(value * 100);
  const integerPart = Math.floor(cents / 100);
  const decimalPart = cents % 100;
  return `${integerPart},${decimalPart.toString().padStart(2, "0")}`;
};

// Parse string (ex: "5,50" -> 5.5)
export const parseFormattedTaxRate = (formatted: string): number | null => {
  if (!formatted) return null;
  const cleaned = formatted.replace(",", "");
  const cents = parseInt(cleaned, 10);
  if (isNaN(cents)) return null;
  const value = cents / 100;
  return value > 100 ? 100 : value;
};

// Handle the input
export const handleTaxRateInput = (
  currentFormatted: string,
  newInput: string,
  field: { onChange: (value: number | null) => void },
) => {
  // Remove all except for numbers
  const digitsOnly = newInput.replace(/[^0-9]/g, "");

  // If it's empty return null
  if (digitsOnly === "") {
    field.onChange(null);
    return "";
  }

  // Limited to 4 digits only
  const limited = digitsOnly.slice(0, 4);

  const cents = parseInt(limited, 10);
  if (isNaN(cents)) {
    field.onChange(null);
    return "";
  }

  const value = cents / 100;

  if (value > 100) {
    field.onChange(100);
    return "100,00";
  }

  field.onChange(value);

  const integerPart = Math.floor(cents / 100);
  const decimalPart = cents % 100;
  return `${integerPart},${decimalPart.toString().padStart(2, "0")}`;
};
