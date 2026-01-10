'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Locale } from './i18n';
import { saveLocale, loadLocale } from './locale-storage';
import { detectBrowserLocale } from './i18n';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved locale on mount
  useEffect(() => {
    const savedLocale = loadLocale();
    if (savedLocale) {
      setLocaleState(savedLocale);
    } else {
      // Detect browser locale if no saved preference
      const detected = detectBrowserLocale();
      setLocaleState(detected);
    }
    setIsInitialized(true);
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    saveLocale(newLocale);
  };

  // Don't render children until locale is initialized to prevent flash
  if (!isInitialized) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
