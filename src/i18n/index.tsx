'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import es from './locales/es.json';
import en from './locales/en.json';
import pt from './locales/pt.json';

export type Locale = 'es' | 'en' | 'pt';

const translations: Record<Locale, Record<string, unknown>> = { es, en, pt };

export const LOCALE_LABELS: Record<Locale, string> = {
  es: '🇪🇸 Español',
  en: '🇺🇸 English',
  pt: '🇧🇷 Português',
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇺🇸',
  pt: '🇧🇷',
};

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'es',
  setLocale: () => {},
  t: (key) => key,
});

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');

  // Load saved locale on mount
  useEffect(() => {
    const saved = localStorage.getItem('tak_locale') as Locale | null;
    if (saved && translations[saved]) {
      setLocaleState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('tak_locale', l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations[locale], key);
      // Fallback to Spanish
      if (value === undefined) {
        value = getNestedValue(translations.es, key);
      }
      // Still not found — return key
      if (value === undefined) return key;
      // Replace {param} placeholders
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }
      return value;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
