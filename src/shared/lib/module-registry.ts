import { createSignal, type Component, lazy } from "solid-js";
import type { ModuleDef, RouteDef, NavItemDef, SlotsDef } from "@/shared/types/module.types";

type SlotLoader = () => Promise<{ default: Component }>;

const modules = new Map<string, ModuleDef>();
const [navItems, setNavItems] = createSignal<NavItemDef[]>([]);
const [routes, setRoutes] = createSignal<RouteDef[]>([]);
const [globalVersion, setGlobalVersion] = createSignal(0);

// Lazy component cache — prevents remounting when memos recompute
const lazyCache = new WeakMap<SlotLoader, Component>();
export function getLazy(loader: SlotLoader): Component {
  if (!lazyCache.has(loader)) lazyCache.set(loader, lazy(loader));
  return lazyCache.get(loader)!;
}

// Global loaders collected once at registration time, deduped by reference
const globalLoaders = new Map<keyof SlotsDef, Set<SlotLoader>>();

export function globalSlot(loader: SlotLoader): SlotLoader {
  (loader as any).__global = true;
  return loader;
}

export function registerModule(def: ModuleDef) {
  if (modules.has(def.id)) {
    console.warn(`Module "${def.id}" already registered`);
    return;
  }
  modules.set(def.id, def);

  // Collect global loaders at registration — Set deduplicates by reference
  if (def.slots) {
    for (const [slot, entry] of Object.entries(def.slots)) {
      const loaders = Array.isArray(entry) ? entry : [entry];
      for (const l of loaders as SlotLoader[]) {
        if ((l as any).__global) {
          const key = slot as keyof SlotsDef;
          if (!globalLoaders.has(key)) globalLoaders.set(key, new Set());
          globalLoaders.get(key)!.add(l);
          setGlobalVersion((v) => v + 1);
        }
      }
    }
  }

  if (def.navItem) setNavItems((prev) => [...prev, def.navItem!]);
  const taggedRoutes = def.routes.map((r) => ({ ...r, moduleId: def.id }));
  setRoutes((prev) => [...prev, ...taggedRoutes]);
}

export function getNavItems() {
  return navItems;
}

export function getRoutes() {
  return routes;
}

export function getModule(id: string) {
  return modules.get(id) ?? null;
}

export function getGlobalVersion() {
  return globalVersion;
}

// Global widgets — always mounted, never torn down
export function resolveGlobalSlots(slot: keyof SlotsDef): SlotLoader[] {
  return [...(globalLoaders.get(slot) ?? [])];
}

// Module-local widgets — swapped on navigation, globals excluded
export function resolveModuleSlot(slot: keyof SlotsDef, moduleId: string): SlotLoader[] {
  const entry = modules.get(moduleId)?.slots?.[slot];
  if (!entry) return [];
  const loaders = Array.isArray(entry) ? entry : [entry];
  return (loaders as SlotLoader[]).filter((l) => !(l as any).__global);
}

// Returns false when the module has an appName that isn't in the installed set.
// Empty set is treated as "not yet loaded" — all modules pass through.
export function isModuleActive(moduleId: string, installedApps: Set<string>): boolean {
  const mod = modules.get(moduleId);
  if (!mod) return false;
  if (!mod.appName) return true;
  if (installedApps.size === 0) return true;
  return installedApps.has(mod.appName);
}

// Nav items from modules that have no Hubzilla appName (SPA-exclusive features).
export function getSpaExclusiveNavItems(): NavItemDef[] {
  const result: NavItemDef[] = [];
  for (const mod of modules.values()) {
    if (!mod.appName && mod.navItem) result.push(mod.navItem);
  }
  return result;
}

// Keep for any existing call sites
export function resolveSlot(slot: keyof SlotsDef, moduleId?: string) {
  if (moduleId) return modules.get(moduleId)?.slots?.[slot] ?? null;
  for (const mod of modules.values()) {
    if (mod.slots?.[slot]) return mod.slots[slot];
  }
  return null;
}

// Resolve the module ID for a given pathname by matching against registered
// route patterns. Falls back to the first URL segment so existing behaviour
// is preserved for modules whose route root matches their module ID.
export function moduleIdForPath(pathname: string): string {
  for (const route of getRoutes()()) {
    // Strip dynamic and wildcard tails: "/cal/:nick" → "/cal", "/cdav/calendar" → "/cdav/calendar"
    const staticPrefix = route.path.replace(/\/:[^/].*/, "").replace(/\/\*.*/, "");
    if (pathname === staticPrefix || pathname.startsWith(staticPrefix + "/")) {
      return route.moduleId ?? "";
    }
  }
  return pathname.split("/").filter(Boolean)[0] ?? "";
}
