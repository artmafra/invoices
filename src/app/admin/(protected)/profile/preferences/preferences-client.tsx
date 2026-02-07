"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { localeNames, locales, type Locale } from "@/i18n/config";
import { Globe, List, Monitor, Moon, Proportions, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { type Density } from "@/config/ui.config";
import {
  PAGINATION_SIZE_OPTIONS,
  updateLanguageOnServer,
  usePreferences,
  type LocalPreferences,
  type PaginationSize,
} from "@/lib/preferences";
import { useThemeTransition } from "@/hooks/use-theme-transition";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminErrorFallback } from "@/components/shared/admin-error-fallback";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { LoadingTransition } from "@/components/shared/loading-transition";
import { PageContainer } from "@/components/shared/page-container";
import { PageDescription } from "@/components/shared/page-description";
import { TimezoneSelect } from "@/components/shared/timezone-select";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Section, SectionContent } from "@/components/ui/section";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarInset } from "@/components/ui/sidebar";

interface PreferencesClientProps {
  initialPreferences: LocalPreferences;
  initialTheme: string;
}

/**
 * Preferences Page Client Component
 *
 * Device-bound preferences stored in cookies.
 * Receives initial values from server for SSR hydration match.
 */
export function PreferencesClient({ initialPreferences, initialTheme }: PreferencesClientProps) {
  return (
    <ErrorBoundary fallback={AdminErrorFallback}>
      <PreferencesClientContent
        initialPreferences={initialPreferences}
        initialTheme={initialTheme}
      />
    </ErrorBoundary>
  );
}

function PreferencesClientContent({ initialPreferences, initialTheme }: PreferencesClientProps) {
  const t = useTranslations("profile.preferences");
  const tc = useTranslations("common");
  const router = useRouter();
  const { prefs, setPref } = usePreferences({ initialPreferences });
  const { theme, switchTheme } = useThemeTransition();

  // Loading state for language server sync
  const [isLanguageSaving, setIsLanguageSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Local state for pending changes (save on button click)
  const [pendingTheme, setPendingTheme] = useState<string>(initialTheme);
  const [pendingLanguage, setPendingLanguage] = useState<Locale>(prefs.language);
  const [pendingTimezone, setPendingTimezone] = useState<string>(prefs.timezone);
  const [pendingPaginationSize, setPendingPaginationSize] = useState<PaginationSize>(
    prefs.paginationSize,
  );
  const [pendingDensity, setPendingDensity] = useState<Density>(prefs.density);

  // Track when component is mounted to avoid SSR mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get current theme value (initialTheme during SSR, actual theme after mount)
  const currentTheme = mounted ? theme : initialTheme;

  // Dirty tracking
  const isThemeDirty = pendingTheme !== currentTheme;
  const isLanguageDirty = pendingLanguage !== prefs.language;
  const isTimezoneDirty = pendingTimezone !== prefs.timezone;
  const isPaginationDirty = pendingPaginationSize !== prefs.paginationSize;
  const isDensityDirty = pendingDensity !== prefs.density;

  // Sync pending values when theme changes (only on client after mount)
  useEffect(() => {
    if (theme !== undefined) {
      setPendingTheme(theme);
    }
  }, [theme]);

  useEffect(() => {
    setPendingLanguage(prefs.language);
    setPendingTimezone(prefs.timezone);
    setPendingPaginationSize(prefs.paginationSize);
    setPendingDensity(prefs.density);
  }, [prefs.language, prefs.timezone, prefs.paginationSize, prefs.density]);

  // ============================================================================
  // Theme Handler
  // ============================================================================

  const handleThemeChange = useCallback((value: string) => {
    setPendingTheme(value);
  }, []);

  const handleThemeSave = useCallback(() => {
    switchTheme(pendingTheme);
    toast.success(t("saved"));
  }, [switchTheme, pendingTheme, t]);

  // ============================================================================
  // Language Handler (with server sync)
  // ============================================================================

  const handleLanguageChange = useCallback((value: Locale) => {
    setPendingLanguage(value);
  }, []);

  const handleLanguageSave = useCallback(async () => {
    setIsLanguageSaving(true);
    try {
      setPref("language", pendingLanguage);
      await updateLanguageOnServer(pendingLanguage);
      toast.success(t("saved"));
      router.refresh();
    } catch {
      toast.error(t("errors.saveFailed"));
    } finally {
      setIsLanguageSaving(false);
    }
  }, [setPref, pendingLanguage, router, t]);

  // ============================================================================
  // Timezone Handler
  // ============================================================================

  const handleTimezoneChange = useCallback((value: string) => {
    setPendingTimezone(value);
  }, []);

  const handleTimezoneSave = useCallback(() => {
    setPref("timezone", pendingTimezone);
    toast.success(t("saved"));
  }, [setPref, pendingTimezone, t]);

  // ============================================================================
  // Pagination Size Handler
  // ============================================================================

  const handlePaginationSizeChange = useCallback((value: string) => {
    setPendingPaginationSize(Number(value) as PaginationSize);
  }, []);

  const handlePaginationSizeSave = useCallback(() => {
    setPref("paginationSize", pendingPaginationSize);
    toast.success(t("saved"));
  }, [setPref, pendingPaginationSize, t]);

  // ============================================================================
  // Density Handler
  // ============================================================================

  const handleDensityChange = useCallback((value: Density) => {
    setPendingDensity(value);
  }, []);

  const handleDensitySave = useCallback(() => {
    setPref("density", pendingDensity);
    toast.success(t("saved"));
  }, [setPref, pendingDensity, t]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <SidebarInset>
      <AdminHeader title={t("title")} />
      <PageContainer>
        <PageDescription>{t("description")}</PageDescription>
        <Section>
          <LoadingTransition showLoadingIndicator={false}>
            <SectionContent>
              {/* Theme Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("theme.label")}</CardTitle>
                  <CardDescription>{t("theme.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={pendingTheme} onValueChange={handleThemeChange}>
                    <SelectTrigger className="w-full md:max-w-sm">
                      <SelectValue>
                        <span className="flex items-center gap-space-sm">
                          {pendingTheme === "light" && <Sun className="size-4" />}
                          {pendingTheme === "dark" && <Moon className="size-4" />}
                          {pendingTheme === "system" && <Monitor className="size-4" />}
                          <span>{t(`theme.${pendingTheme}`)}</span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <div className="flex items-center gap-space-sm">
                          <Sun className="size-4" />
                          <span>{t("theme.light")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="dark">
                        <div className="flex items-center gap-space-sm">
                          <Moon className="size-4" />
                          <span>{t("theme.dark")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="system">
                        <div className="flex items-center gap-space-sm">
                          <Monitor className="size-4" />
                          <span>{t("theme.system")}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button onClick={handleThemeSave} disabled={!isThemeDirty}>
                    {tc("buttons.save")}
                  </Button>
                </CardFooter>
              </Card>

              {/* Language Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("language.label")}</CardTitle>
                  <CardDescription>{t("language.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={pendingLanguage}
                    onValueChange={handleLanguageChange}
                    disabled={isLanguageSaving}
                  >
                    <SelectTrigger className="w-full md:max-w-sm">
                      <SelectValue>
                        <span className="flex items-center gap-space-sm">
                          <Globe className="size-4" />
                          <span>{localeNames[pendingLanguage]}</span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map((locale) => (
                        <SelectItem key={locale} value={locale}>
                          <div className="flex items-center gap-space-sm">
                            <Globe className="size-4" />
                            <span>{localeNames[locale]}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button
                    onClick={handleLanguageSave}
                    disabled={!isLanguageDirty || isLanguageSaving}
                  >
                    {isLanguageSaving ? tc("loading.saving") : tc("buttons.save")}
                  </Button>
                </CardFooter>
              </Card>

              {/* Timezone Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("timezone.label")}</CardTitle>
                  <CardDescription>{t("timezone.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-space-md">
                  <div className="w-full md:max-w-sm">
                    <TimezoneSelect value={pendingTimezone} onValueChange={handleTimezoneChange} />
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button onClick={handleTimezoneSave} disabled={!isTimezoneDirty}>
                    {tc("buttons.save")}
                  </Button>
                </CardFooter>
              </Card>

              {/* Pagination Size Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("itemsPerPage.label")}</CardTitle>
                  <CardDescription>{t("itemsPerPage.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={String(pendingPaginationSize)}
                    onValueChange={handlePaginationSizeChange}
                  >
                    <SelectTrigger className="w-full md:max-w-sm">
                      <SelectValue>
                        <span className="flex items-center gap-space-sm">
                          <List className="size-4" />
                          <span>
                            {pendingPaginationSize} {tc("items")}
                          </span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PAGINATION_SIZE_OPTIONS.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          <div className="flex items-center gap-space-sm">
                            <List className="size-4" />
                            <span>
                              {size} {tc("items")}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button onClick={handlePaginationSizeSave} disabled={!isPaginationDirty}>
                    {tc("buttons.save")}
                  </Button>
                </CardFooter>
              </Card>

              {/* Density Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("density.label")}</CardTitle>
                  <CardDescription>{t("density.description")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={pendingDensity} onValueChange={handleDensityChange}>
                    <SelectTrigger className="w-full md:max-w-sm">
                      <SelectValue>
                        <span className="flex items-center gap-space-sm">
                          <Proportions className="size-4" />
                          <span>{t(`density.${pendingDensity}`)}</span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">
                        <div className="flex items-center gap-space-sm">
                          <Proportions className="size-4" />
                          <span>{t("density.compact")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="comfortable">
                        <div className="flex items-center gap-space-sm">
                          <Proportions className="size-4" />
                          <span>{t("density.comfortable")}</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="spacious">
                        <div className="flex items-center gap-space-sm">
                          <Proportions className="size-4" />
                          <span>{t("density.spacious")}</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button onClick={handleDensitySave} disabled={!isDensityDirty}>
                    {tc("buttons.save")}
                  </Button>
                </CardFooter>
              </Card>
            </SectionContent>
          </LoadingTransition>
        </Section>
      </PageContainer>
    </SidebarInset>
  );
}
