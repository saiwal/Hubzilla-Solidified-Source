import { dict as en } from "./en/index";  // ← was "./en"
import { dict as hi } from "./hi";
// ← import new locale dict here

import type { RawDictionary } from "./namespaces/types";

export type { RawDictionary };

export const localeRegistry = {
  en: { dict: en, label: "English", flag: "🇬🇧" },
  hi: { dict: hi, label: "Hindi",   flag: "🇮🇳" },
  // ← and register it here
} satisfies Record<string, { dict: RawDictionary; label: string; flag: string }>;

export type Locale = keyof typeof localeRegistry;
