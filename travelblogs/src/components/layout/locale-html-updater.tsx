'use client';

import { useEffect } from 'react';
import { useLocale } from '@/utils/locale-context';

/**
 * Updates the HTML lang attribute when locale changes
 * Must be mounted inside LocaleProvider
 */
export function LocaleHtmlUpdater() {
  const { locale } = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
