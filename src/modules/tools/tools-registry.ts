import type { Component } from "solid-js";
import type * as i18n from "@solid-primitives/i18n";
import type { RawDictionary } from "@/i18n/locales/namespaces/types";
import type { ToolId } from "./store";
import { Calculator } from "./components/Calculator";
import { QRGenerator } from "./components/QRGenerator";
import { UnitConverter } from "./components/UnitConverter";
import { Base64Tool } from "./components/Base64Tool";
import { PasswordGenerator } from "./components/PasswordGenerator";

// Derive the exact key union that t() accepts — stays in sync with the
// dictionary automatically. TypeScript will error here if a key doesn't exist.
type TranslatorKey = keyof i18n.Flatten<RawDictionary>;

export type ToolEntry = {
  id: ToolId;
  labelKey: TranslatorKey;
  icon: string;
  component: Component;
};

export const TOOLS: ToolEntry[] = [
  { id: "calculator",     labelKey: "tools.calc",     icon: "🧮", component: Calculator },
  { id: "qr",             labelKey: "tools.qr",       icon: "⬛", component: QRGenerator },
  { id: "unit-converter", labelKey: "tools.unit",     icon: "📏", component: UnitConverter },
  { id: "base64",         labelKey: "tools.base64",   icon: "🔣", component: Base64Tool },
  { id: "password",       labelKey: "tools.password", icon: "🔑", component: PasswordGenerator },
];
