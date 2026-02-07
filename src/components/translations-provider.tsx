"use client";

import { ReactNode } from "react";
import { AbstractIntlMessages, NextIntlClientProvider } from "next-intl";

interface TranslationsProviderProps {
  children: ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone?: string;
}

/**
 * Client-side translations provider.
 *
 * Wraps NextIntlClientProvider to provide translations to client components.
 * Use `useTranslations('namespace')` in client components to access translations.
 */
export function TranslationsProvider({
  children,
  locale,
  messages,
  timeZone = "UTC",
}: TranslationsProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
