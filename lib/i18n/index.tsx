"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { en } from "./en";
import { es } from "./es";
import { zh } from "./zh";

export type Locale = "en" | "es" | "zh";

const translations: Record<Locale, typeof en> = { en, es, zh };

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  zh: "中文",
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: typeof en;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dcc-locale");
      if (saved && saved in translations) return saved as Locale;
    }
    return "en";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("dcc-locale", l);
      document.documentElement.lang = l;
    }
  }, []);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
