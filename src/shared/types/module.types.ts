import { type Component } from "solid-js";

export interface NavItemDef {
  label: string;
  icon: string;
  path: string;
  href: string;
}

export interface SlotsDef {
  right?: () => Promise<{ default: Component }>;
  leftBottom?: () => Promise<{ default: Component }>;
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
