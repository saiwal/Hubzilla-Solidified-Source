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
import {
  MdOutlineCalculate,
  MdOutlineQr_code_2,
  MdOutlineStraighten,
  MdOutlineData_object,
  MdOutlineKey,
  MdFillImage,
  MdOutlineMovie,
} from "solid-icons/md";

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
  icon: Component<{ class?: string }>;
  component: Component;
};

export const TOOLS: ToolEntry[] = [
  { id: "calculator",     labelKey: "tools.calc",     icon: MdOutlineCalculate,   component: Calculator },
  { id: "qr",             labelKey: "tools.qr",       icon: MdOutlineQr_code_2,   component: QRGenerator },
  { id: "unit-converter", labelKey: "tools.unit",     icon: MdOutlineStraighten,  component: UnitConverter },
  { id: "base64",         labelKey: "tools.base64",   icon: MdOutlineData_object, component: Base64Tool },
  { id: "password",       labelKey: "tools.password", icon: MdOutlineKey,         component: PasswordGenerator },
  { id: "image-editor",   labelKey: "tools.img",      icon: MdFillImage,          component: ImageEditor },
  { id: "video-editor",   labelKey: "tools.vid",      icon: MdOutlineMovie,       component: VideoEditor },
];
