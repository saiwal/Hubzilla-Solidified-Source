import { createSignal, type Component} from "solid-js";
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
    const s = modules.get(moduleId)?.slots?.[slot];
    return s ?? null;
  }
  // collect from ALL modules that provide this slot, flatten into a single array
  const loaders: (() => Promise<{ default: Component }>)[] = [];
  for (const mod of modules.values()) {
    const s = mod.slots?.[slot];
    if (!s) continue;
    if (Array.isArray(s)) loaders.push(...s);
    else loaders.push(s);
  }
  return loaders.length > 0 ? loaders : null;
}

export function getModule(id: string) {
  return modules.get(id) ?? null;
}
