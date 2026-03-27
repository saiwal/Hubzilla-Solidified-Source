import { createSignal } from "solid-js";
import type { LayoutConfig, } from "./shared/types/layout.types";
import type { SlotName } from "./shared/types/module.types";
import { defaultLayoutConfig } from "./shared/types/layout.types";

const STORAGE_KEY = "hubzilla:layout";

function loadFromStorage(): LayoutConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return defaultLayoutConfig;
}

function saveToStorage(config: LayoutConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

const [layout, setLayout] = createSignal<LayoutConfig>(loadFromStorage());

export function getLayout() {
  return layout;
}

export function getSlotWidgets(slot: SlotName): string[] {
  return layout().slots[slot] ?? [];
}

export function setSlotWidgets(slot: SlotName, widgetIds: string[]) {
  const next = { ...layout(), slots: { ...layout().slots, [slot]: widgetIds } };
  setLayout(next);
  saveToStorage(next);
}

export function addWidgetToSlot(slot: SlotName, widgetId: string) {
  const current = getSlotWidgets(slot);
  if (current.includes(widgetId)) return;
  setSlotWidgets(slot, [...current, widgetId]);
}

export function removeWidgetFromSlot(slot: SlotName, widgetId: string) {
  setSlotWidgets(slot, getSlotWidgets(slot).filter((id) => id !== widgetId));
}

export function moveWidget(fromSlot: SlotName, toSlot: SlotName, widgetId: string) {
  removeWidgetFromSlot(fromSlot, widgetId);
  addWidgetToSlot(toSlot, widgetId);
}

export function resetLayout() {
  setLayout(defaultLayoutConfig);
  saveToStorage(defaultLayoutConfig);
}
