import { type Component } from "solid-js";

export type NavContext =
  | "owner"
  | "local"
  | "remote"
  | "anonymous"
  | "all"
  | "admin";

export interface NavItemDef {
  label: string | (() => string);
  icon: string;
  path: string;
  href: string | (() => string);
  context?: NavContext | NavContext[]; // single or array of allowed roles
  hidden?: boolean;
}

type SlotLoader = () => Promise<{ default: Component }>;

export interface SlotsDef {
  right?: SlotLoader | SlotLoader[];
  leftBottom?: SlotLoader | SlotLoader[];
  mainTop?: SlotLoader | SlotLoader[];
  rightVisitor?: SlotLoader | SlotLoader[];
 help?: () => Promise<{ default: Component }>;
}

export interface ModuleDef {
  id: string;
  routes: RouteDef[];
  navItem?: NavItemDef;
  slots?: SlotsDef;
  permissions?: string[];
  /** Hubzilla app name (e.g. "Photos"). If set, module only renders when this app is installed. */
  appName?: string;
}

export interface RouteDef {
  path: string;
  component: () => Promise<{ default: Component }>;
  /** Set automatically by registerModule — do not supply manually. */
  moduleId?: string;
}
