import type { Locale } from './i18n';

const LOCALE_STORAGE_KEY = 'travelblogs_locale';

/**
 * Save locale preference to localStorage
 * @param locale - Locale to save ('en' or 'de')
 */
export function saveLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }
}

/**
 * Load locale preference from localStorage
 * @returns Saved locale or null if not found
 */
export function loadLocale(): Locale | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'en' || saved === 'de') {
      return saved;
    }
  }
  return null;
}

/**
 * Clear locale preference from localStorage
 */
export function clearLocale(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCALE_STORAGE_KEY);
  }
}
