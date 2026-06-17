import type { RawDictionary } from "./namespaces/types";

export type { RawDictionary };

export const localeRegistry = {
  en: { label: "English", flag: "🇬🇧", load: (): Promise<RawDictionary> => import("./en/index").then((m) => m.dict) },
  hi: { label: "Hindi",   flag: "🇮🇳", load: (): Promise<RawDictionary> => import("./hi/index").then((m) => m.dict) },
  // ← add new locales here
} satisfies Record<string, { label: string; flag: string; load: () => Promise<RawDictionary> }>;

export type Locale = keyof typeof localeRegistry;
