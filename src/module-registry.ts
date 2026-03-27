import { createSignal } from "solid-js";
import type { ModuleDef, RouteDef, NavItemDef, SlotsDef } from "./shared/types/module.types";

const modules = new Map<string, ModuleDef>();

// reactive nav items so Layout re-renders when modules register
const [navItems, setNavItems] = createSignal<NavItemDef[]>([]);
const [routes, setRoutes] = createSignal<RouteDef[]>([]);

export function registerModule(def: ModuleDef) {
  if (modules.has(def.id)) {
    console.warn(`Module "${def.id}" already registered`);
    return;
  }
  modules.set(def.id, def);
  setNavItems((prev) => [...prev, def.navItem]);
  setRoutes((prev) => [...prev, ...def.routes]);
}

export function getNavItems() {
  return navItems;
}

export function getRoutes() {
  return routes;
}

export function resolveSlot(slot: keyof SlotsDef, moduleId?: string) {
  if (moduleId) {
    return modules.get(moduleId)?.slots?.[slot] ?? null;
  }
  // return first module that provides this slot
  for (const mod of modules.values()) {
    if (mod.slots?.[slot]) return mod.slots[slot];
  }
  return null;
}

export function getModule(id: string) {
  return modules.get(id) ?? null;
}
