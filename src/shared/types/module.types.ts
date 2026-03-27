import { type Component } from "solid-js";

export interface WidgetDef {
  id: string;
  name: string;
  description?: string;
  defaultSlot: SlotName;
  component: () => Promise<{ default: Component }>;
}

export type SlotName = "left" | "main" | "right";

export interface NavItemDef {
  label: string;
  icon: string;
  path: string;
  href: string;
}

export interface ModuleDef {
  id: string;
  routes: RouteDef[];
  navItem: NavItemDef;
  widgets?: WidgetDef[];
  permissions?: string[];
}

export interface RouteDef {
  path: string;
  component: () => Promise<{ default: Component }>;
}
