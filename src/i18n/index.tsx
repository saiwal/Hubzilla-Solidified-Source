import { createContext, useContext, createMemo, createSignal, createResource } from "solid-js";
import type { ParentComponent } from "solid-js";
import * as i18n from "@solid-primitives/i18n";
import { storageSet } from "@/shared/lib/storage";
import { dict as enDict } from "./locales/en/index";
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

function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem("hz-locale");
    if (saved && saved in localeRegistry) return saved as Locale;
  } catch {}
  return FALLBACK;
}

export const I18nProvider: ParentComponent = (props) => {
  const [locale, setLocaleSignal] = createSignal<Locale>(getInitialLocale());

  // EN is statically imported above (main bundle). Other locales load lazily.
  // initialValue seeds the resource so the first render is never empty.
  const [rawDict] = createResource(
    locale,
    (loc) => localeRegistry[loc].load(),
    { initialValue: enDict },
  );

  // .latest keeps the previous locale visible while the next one loads —
  // avoids a flash of raw keys on locale switch.
  const dict = createMemo((): Dictionary => i18n.flatten(rawDict.latest ?? enDict));

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
    storageSet("hz-locale", l);
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
