import "@/app/globals.css";
import type { Metadata } from "next";
import { Fira_Sans } from "next/font/google";
import { getLocale, getMessages, getTimeZone } from "next-intl/server";
import { siteConfig } from "@/config/site.config";
import { auth } from "@/lib/auth";
import { getNonce } from "@/lib/nonce";
import { getPreferencesFromCookies } from "@/lib/preferences/preferences.server";
import { settingsService } from "@/services/runtime/settings";
import AuthProvider from "@/components/auth-provider";
import { NonceProvider } from "@/components/nonce-provider";
import ReactQueryProvider from "@/components/query-provider";
import { SettingsProvider } from "@/components/settings-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TranslationsProvider } from "@/components/translations-provider";
import { Toaster } from "@/components/ui/sonner";

const firaSans = Fira_Sans({
  variable: "--font-fira-sans",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

// Generate metadata from site config
export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  openGraph: siteConfig.ogImage ? { images: [siteConfig.ogImage] } : undefined,
  icons: {
    icon: [
      { url: "/images/favicon/favicon.ico", sizes: "48x48" },
      { url: "/images/favicon/icon0.svg", type: "image/svg+xml" },
    ],
    apple: "/images/favicon/apple-icon.png",
  },
  manifest: "/images/favicon/manifest.json",
};

// Force dynamic rendering since auth() uses headers
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [session, settings, locale, messages, timeZone, nonce, preferences] = await Promise.all([
    auth(),
    settingsService.getSettings({ scope: "public" }),
    getLocale(),
    getMessages(),
    getTimeZone(),
    getNonce(),
    getPreferencesFromCookies(),
  ]);

  return (
    <html lang={locale} data-density={preferences.density} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-title" content={siteConfig.name} />
      </head>
      <body className={`${firaSans.variable} ${firaSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <NonceProvider nonce={nonce}>
            <ReactQueryProvider>
              <TranslationsProvider locale={locale} messages={messages} timeZone={timeZone}>
                <SettingsProvider settings={settings}>
                  <AuthProvider session={session}>{children}</AuthProvider>
                </SettingsProvider>
              </TranslationsProvider>
            </ReactQueryProvider>
            <Toaster />
          </NonceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
