import { dict as en } from "./en";
import { dict as hi } from "./hi";
// ← add new locale here only

import type { RawDictionary } from "./en";

export type { RawDictionary };

export const localeRegistry = {
  en: { dict: en, label: "English", flag: "🇬🇧" },
  hi: { dict: hi, label: "Hindi", flag: "🇮🇳 " },
  // ← and here
} satisfies Record<string, { dict: RawDictionary; label: string; flag: string }>;

export type Locale = keyof typeof localeRegistry;
