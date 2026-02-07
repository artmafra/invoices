import type { PaginationSize } from "@/lib/preferences";
import { usePreferencesContext } from "@/components/preferences-provider";

/**
 * Returns the user's pagination size preference.
 * Value is SSR-injected from cookies via PreferencesProvider.
 *
 * @throws Error if used outside of PreferencesProvider (admin layout)
 */
export function usePaginationSize(): PaginationSize {
  const { paginationSize } = usePreferencesContext();
  return paginationSize;
}

/**
 * Returns pagination size with setter for components that need to update it.
 *
 * @throws Error if used outside of PreferencesProvider (admin layout)
 */
export function usePaginationSizeWithSetter() {
  return usePreferencesContext();
}
