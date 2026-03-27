import type { WidgetDef, SlotName } from "./shared/types/module.types";

const widgets = new Map<string, WidgetDef>();

export function registerWidget(def: WidgetDef) {
  widgets.set(def.id, def);
}

export function getWidget(id: string): WidgetDef | undefined {
  return widgets.get(id);
}

export function getAllWidgets(): WidgetDef[] {
  return Array.from(widgets.values());
}

export function getWidgetsBySlot(slot: SlotName): WidgetDef[] {
  return Array.from(widgets.values()).filter((w) => w.defaultSlot === slot);
}
