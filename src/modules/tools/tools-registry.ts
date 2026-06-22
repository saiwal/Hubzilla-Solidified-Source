import type { Component } from "solid-js";
import type * as i18n from "@solid-primitives/i18n";
import type { RawDictionary } from "@/i18n/locales/namespaces/types";
import { Calculator } from "./components/Calculator";
import { QRGenerator } from "./components/QRGenerator";
import { UnitConverter } from "./components/UnitConverter";
import { Base64Tool } from "./components/Base64Tool";
import { PasswordGenerator } from "./components/PasswordGenerator";
import { ImageEditor } from "./components/ImageEditor";
import { VideoEditor } from "./components/VideoEditor";

type TranslatorKey = keyof i18n.Flatten<RawDictionary>;

export type ToolId =
  | "calculator"
  | "qr"
  | "unit-converter"
  | "base64"
  | "password"
  | "image-editor"
  | "video-editor";

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
  { id: "image-editor",   labelKey: "tools.img",      icon: "🖼️", component: ImageEditor },
  { id: "video-editor",   labelKey: "tools.vid",      icon: "🎬", component: VideoEditor },
];
