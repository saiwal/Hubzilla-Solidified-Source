import { createSignal, type Component, lazy } from "solid-js";
import type {
  ComponentLoader,
  ModuleDef,
  NavItemDef,
  RouteDef,
  WidgetDef,
  WidgetSlotName,
} from "@/shared/types/module.types";

// Widget as stored in the registry: defaults resolved, owning module recorded
export interface RegisteredWidget extends WidgetDef {
  moduleId: string;
  defaultModules: string[];
}

const modules = new Map<string, ModuleDef>();
const widgets = new Map<string, RegisteredWidget>();
const [navItems, setNavItems] = createSignal<NavItemDef[]>([]);
const [routes, setRoutes] = createSignal<RouteDef[]>([]);
const [widgetVersion, setWidgetVersion] = createSignal(0);

// Lazy component cache — prevents remounting when memos recompute
const lazyCache = new WeakMap<ComponentLoader<any>, Component<any>>();
export function getLazy<P extends Record<string, any> = {}>(loader: ComponentLoader<P>): Component<P> {
  if (!lazyCache.has(loader)) lazyCache.set(loader, lazy(loader));
  return lazyCache.get(loader)!;
}

export function registerModule(def: ModuleDef) {
  if (modules.has(def.id)) {
    console.warn(`Module "${def.id}" already registered`);
    return;
  }
  modules.set(def.id, def);

  if (def.slots && Object.values(def.slots).some((e) => (Array.isArray(e) ? e.length > 0 : !!e))) {
    console.warn(`Module "${def.id}" uses deprecated "slots" — migrate to "widgets" (entries are ignored)`);
  }

  if (def.widgets) {
    for (const w of def.widgets) {
      if (widgets.has(w.id)) {
        console.warn(`Widget "${w.id}" already registered`);
        continue;
      }
      widgets.set(w.id, {
        ...w,
        moduleId: def.id,
        defaultModules: w.defaultModules ?? [def.id],
      });
    }
    setWidgetVersion((v) => v + 1);
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

export function getWidgetVersion() {
  return widgetVersion;
}

export function getWidget(id: string): RegisteredWidget | null {
  return widgets.get(id) ?? null;
}

// Registration-order list of every known widget (picker UI, layout validation)
export function getAllWidgets(): RegisteredWidget[] {
  return [...widgets.values()];
}

// Global widgets — always mounted, never torn down
export function resolveGlobalSlots(slot: WidgetSlotName): RegisteredWidget[] {
  return [...widgets.values()].filter((w) => w.global && w.slot === slot);
}

// Module-local widgets — swapped on navigation, globals excluded
export function resolveModuleSlot(slot: WidgetSlotName, moduleId: string): RegisteredWidget[] {
  return [...widgets.values()].filter(
    (w) => !w.global && w.slot === slot && w.defaultModules.includes(moduleId),
  );
}

// Whether a user may place the widget on the given module's pages
export function widgetAllowedIn(w: RegisteredWidget, moduleId: string): boolean {
  const contexts = w.contexts ?? w.defaultModules;
  return contexts === "any" || contexts.includes(moduleId);
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
