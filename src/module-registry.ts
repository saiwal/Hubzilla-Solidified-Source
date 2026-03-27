import { createSignal } from "solid-js";
import type { ModuleDef, RouteDef, NavItemDef } from "./shared/types/module.types";
import { registerWidget } from "./widget-registry";
import { addWidgetToSlot, getSlotWidgets } from "./layout-store";

const modules = new Map<string, ModuleDef>();
const [navItems, setNavItems] = createSignal<NavItemDef[]>([]);
const [routes, setRoutes] = createSignal<RouteDef[]>([]);

export function registerModule(def: ModuleDef) {
  if (modules.has(def.id)) return;
  modules.set(def.id, def);
  setNavItems((prev) => [...prev, def.navItem]);
  setRoutes((prev) => [...prev, ...def.routes]);

  // register widgets and place them in their default slot
  // only if not already placed (respects saved layout)
  for (const widget of def.widgets ?? []) {
    registerWidget(widget);
    const alreadyPlaced = (["left", "main", "right"] as const).some((slot) =>
      getSlotWidgets(slot).includes(widget.id)
    );
    if (!alreadyPlaced) {
      addWidgetToSlot(widget.defaultSlot, widget.id);
    }
  }
}

export function getNavItems() { return navItems; }
export function getRoutes() { return routes; }
