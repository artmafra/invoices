"use client";

import * as React from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Country codes with dial codes
const COUNTRIES = [
  { code: "BR", dialCode: "+55" },
  { code: "NO", dialCode: "+47" },
  { code: "FR", dialCode: "+33" },
  { code: "DE", dialCode: "+49" },
  { code: "US", dialCode: "+1" },
  { code: "GB", dialCode: "+44" },
  { code: "JP", dialCode: "+81" },
  { code: "IT", dialCode: "+39" },
  { code: "CA", dialCode: "+1" },
  { code: "ES", dialCode: "+34" },
  { code: "AU", dialCode: "+61" },
  { code: "PT", dialCode: "+351" },
  { code: "MX", dialCode: "+52" },
  { code: "AR", dialCode: "+54" },
  { code: "CL", dialCode: "+56" },
  { code: "CO", dialCode: "+57" },
  { code: "CN", dialCode: "+86" },
  { code: "KR", dialCode: "+82" },
  { code: "IN", dialCode: "+91" },
  { code: "RU", dialCode: "+7" },
  { code: "ZA", dialCode: "+27" },
  { code: "NL", dialCode: "+31" },
  { code: "BE", dialCode: "+32" },
  { code: "CH", dialCode: "+41" },
  { code: "AT", dialCode: "+43" },
  { code: "SE", dialCode: "+46" },
  { code: "DK", dialCode: "+45" },
  { code: "FI", dialCode: "+358" },
  { code: "PL", dialCode: "+48" },
  { code: "IE", dialCode: "+353" },
  { code: "NZ", dialCode: "+64" },
  { code: "SG", dialCode: "+65" },
  { code: "HK", dialCode: "+852" },
  { code: "TW", dialCode: "+886" },
  { code: "TH", dialCode: "+66" },
  { code: "MY", dialCode: "+60" },
  { code: "PH", dialCode: "+63" },
  { code: "ID", dialCode: "+62" },
  { code: "VN", dialCode: "+84" },
  { code: "AE", dialCode: "+971" },
  { code: "SA", dialCode: "+966" },
  { code: "IL", dialCode: "+972" },
  { code: "TR", dialCode: "+90" },
  { code: "EG", dialCode: "+20" },
  { code: "NG", dialCode: "+234" },
  { code: "KE", dialCode: "+254" },
  { code: "GH", dialCode: "+233" },
] as const;

type Country = (typeof COUNTRIES)[number];

// Hook to get localized country names using Intl.DisplayNames API
function useCountryNames() {
  const locale = useLocale();

  return React.useMemo(() => {
    const displayNames = new Intl.DisplayNames([locale], { type: "region" });
    return (code: string) => displayNames.of(code) || code;
  }, [locale]);
}

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

function PhoneInput({
  value = "",
  onChange,
  defaultCountry = "US",
  placeholder,
  disabled = false,
  className,
  id,
}: PhoneInputProps) {
  const t = useTranslations("common");
  const getCountryName = useCountryNames();
  const [open, setOpen] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(
    () => COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES[0],
  );

  // Parse value to extract dial code and number
  const [phoneNumber, setPhoneNumber] = React.useState(() => {
    if (!value) return "";
    // Try to extract phone number without dial code
    const country = COUNTRIES.find((c) => value.startsWith(c.dialCode));
    if (country) {
      return value.slice(country.dialCode.length).trim();
    }
    return value;
  });

  // Update phone number when value prop changes
  React.useEffect(() => {
    if (!value) {
      setPhoneNumber("");
      return;
    }
    const country = COUNTRIES.find((c) => value.startsWith(c.dialCode));
    if (country) {
      setSelectedCountry(country);
      setPhoneNumber(value.slice(country.dialCode.length).trim());
    } else {
      setPhoneNumber(value);
    }
  }, [value]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);
    // Update parent with new full value
    const fullNumber = phoneNumber ? `${country.dialCode} ${phoneNumber}` : "";
    onChange?.(fullNumber);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPosition = input.selectionStart ?? 0;
    const oldValue = input.value;
    const newNumber = oldValue.replace(/\D/g, "");

    // Calculate how many non-digits were before the cursor
    const beforeCursor = oldValue.slice(0, cursorPosition);
    const nonDigitsBeforeCursor = (beforeCursor.match(/\D/g) || []).length;
    const newCursorPosition = cursorPosition - nonDigitsBeforeCursor;

    setPhoneNumber(newNumber);
    // Update parent with full value including dial code
    const fullNumber = newNumber ? `${selectedCountry.dialCode} ${newNumber}` : "";
    onChange?.(fullNumber);

    // Restore cursor position after React updates the input
    requestAnimationFrame(() => {
      input.setSelectionRange(newCursorPosition, newCursorPosition);
    });
  };

  return (
    <div className={cn("flex", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={t("phoneInput.selectCountry")}
            disabled={disabled}
            className="rounded-r-none border-r-0 font-normal h-[calc(2.25rem*var(--density-multiplier))] px-input-x py-(--spacing-input-y) text-sm"
          >
            <span className="flex items-center gap-space-sm truncate">
              <CountryFlag code={selectedCountry.code} />
              <span className="text-muted-foreground">{selectedCountry.dialCode}</span>
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-70 p-0" align="start">
          <Command>
            <CommandInput placeholder={t("phoneInput.searchCountry")} />
            <CommandList>
              <CommandEmpty>{t("phoneInput.noCountry")}</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((country) => {
                  const countryName = getCountryName(country.code);
                  return (
                    <CommandItem
                      key={country.code}
                      value={`${countryName} ${country.dialCode}`}
                      onSelect={() => handleCountrySelect(country)}
                    >
                      <CountryFlag code={country.code} />
                      <span className="flex-1">{countryName}</span>
                      <span className="text-muted-foreground">{country.dialCode}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        value={phoneNumber}
        inputMode="numeric"
        pattern="[0-9]*"
        onChange={handlePhoneChange}
        placeholder={placeholder ?? t("phoneInput.placeholder")}
        disabled={disabled}
        className="rounded-l-none"
      />
    </div>
  );
}

// Country flag component using SVG images
function CountryFlag({ code, className }: { code: string; className?: string }) {
  return (
    <Image
      src={`/images/flags/png/${code.toLowerCase()}.png`}
      alt={code}
      width={20}
      height={15}
      className={cn("shrink-0 object-cover rounded", className)}
    />
  );
}

export { COUNTRIES, CountryFlag, PhoneInput };
export type { Country, PhoneInputProps };
