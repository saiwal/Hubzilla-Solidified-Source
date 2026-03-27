import { createContext, useContext, createMemo, createSignal } from "solid-js";
import type { ParentComponent } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import { dict as en } from "./locales/en";
import { dict as de } from "./locales/de";
import type { RawDictionary } from "./locales/en";

export type Locale = "en" | "de";

export const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
];
type Dictionary = i18n.Flatten<RawDictionary>;

const dictionaries: Record<Locale, RawDictionary> = { en, de };

// Context holds the translator fn + locale signal
type I18nCtx = {
  t: i18n.Translator<Dictionary>;
  locale: () => Locale;
  setLocale: (l: Locale) => void;
};

const I18nContext = createContext<I18nCtx>();

export const I18nProvider: ParentComponent = (props) => {
  const saved = (localStorage.getItem("hz-locale") ?? "en") as Locale;
  const [locale, setLocaleSignal] = createSignal<Locale>(saved);

  const dict = createMemo(() => i18n.flatten(dictionaries[locale()]));
  const t = i18n.translator(dict, i18n.resolveTemplate);

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

