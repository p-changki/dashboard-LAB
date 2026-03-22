"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CLIENT_STORAGE_KEYS } from "@/lib/client-keys";
import {
  DEFAULT_LOCALE,
  pickLocale,
  resolveLocale,
  type AppLocale,
} from "@/lib/locale";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      setLocaleState(resolveLocale(window.localStorage.getItem(CLIENT_STORAGE_KEYS.locale)));
    } catch {
      setLocaleState(DEFAULT_LOCALE);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;

    try {
      window.localStorage.setItem(CLIENT_STORAGE_KEYS.locale, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (nextLocale: AppLocale) => setLocaleState(nextLocale),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider.");
  }

  return context;
}

export function useLocaleText<T>(values: { ko: T; en: T }) {
  const { locale } = useLocale();
  return pickLocale(locale, values);
}
