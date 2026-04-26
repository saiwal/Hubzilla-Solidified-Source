import { createContext, useContext, createMemo, createSignal } from "solid-js";
import type { ParentComponent } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import { localeRegistry } from "./locales/index";
import type { Locale, RawDictionary } from "./locales/index";

export type { Locale };

export const LOCALES = (
  Object.entries(localeRegistry) as [Locale, { label: string; flag: string }][]
).map(([value, { label, flag }]) => ({ value, label, flag }));

type Dictionary = i18n.Flatten<RawDictionary>;

type I18nCtx = {
  t: i18n.Translator<Dictionary>;
  locale: () => Locale;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nCtx>();
const FALLBACK: Locale = "en";

export const I18nProvider: ParentComponent = (props) => {
  const saved = localStorage.getItem("hz-locale") ?? FALLBACK;
  const initial: Locale =
    saved in localeRegistry ? (saved as Locale) : FALLBACK;

  const [locale, setLocaleSignal] = createSignal<Locale>(initial);
  const dict = createMemo(() => i18n.flatten(localeRegistry[locale()].dict));
  const rawT = i18n.translator(dict, i18n.resolveTemplate);

  const t = (key: any, ...args: any[]) => {
    try {
      const result = rawT(key, ...args);
      return result ?? (key as string);
    } catch {
      console.warn(`[i18n] missing key: ${String(key)}`);
      return key as string;
    }
  };
  const setLocale = (l: Locale) => {
    localStorage.setItem("hz-locale", l);
    setLocaleSignal(l);
  };

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {props.children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
};
