import { type Component } from "solid-js";

export interface NavItemDef {
  label: string | (() => string);
  icon: string;
  path: string;
  href: string;
}

type SlotLoader = () => Promise<{ default: Component }>;

export interface SlotsDef {
  right?: SlotLoader | SlotLoader[];
  leftBottom?: SlotLoader | SlotLoader[];
}

export interface ModuleDef {
  id: string;
  routes: RouteDef[];
  navItem: NavItemDef;
  slots?: SlotsDef;
  permissions?: string[];
}

export interface RouteDef {
  path: string;
  component: () => Promise<{ default: Component }>;
}
