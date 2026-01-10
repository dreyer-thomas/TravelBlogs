'use client';

import { useLocale } from './locale-context';
import { getTranslation, formatDate as formatDateUtil, formatDateTime as formatDateTimeUtil } from './i18n';

/**
 * Custom hook for translations and locale-aware formatting
 */
export function useTranslation() {
  const { locale, setLocale } = useLocale();

  const t = (key: string) => getTranslation(key, locale);

  const formatDate = (date: Date) => formatDateUtil(date, locale);

  const formatDateTime = (date: Date) => formatDateTimeUtil(date, locale);

  return {
    t,
    formatDate,
    formatDateTime,
    locale,
    setLocale,
  };
}
