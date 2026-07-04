import { createSignal } from "solid-js";
import type { WidgetSlotName } from "@/shared/types/module.types";
import { apiFetch } from "@/shared/lib/fetch";

/**
 * User-customised widget placement, keyed by module then slot:
 *   { version: 1, modules: { hq: { right: ["shared.notifications", "network.savedSearch"] } } }
 *
 * Absence of a module/slot entry means "use the registry defaults".
 * An explicit empty array means "the user removed every widget here".
 *
 * Source of truth is pconfig (cat "spa", key "widget_layout"); localStorage
 * holds a copy so the sidebar doesn't flash defaults while pconfig loads.
 */
export interface WidgetLayout {
  version: 1;
  modules: Record<string, Partial<Record<WidgetSlotName, string[]>>>;
}

const LS_KEY = "hz-widget-layout";
const SLOT_NAMES = new Set<string>(["right", "leftBottom", "mainTop", "rightVisitor"]);

// Tolerant parser: unknown slots/shapes are dropped, never thrown on —
// stored layouts outlive code changes.
export function parseWidgetLayout(raw: unknown): WidgetLayout | null {
  if (typeof raw === "string") {
    if (!raw.trim()) return null;
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version !== 1) return null;

  const modules = obj.modules;
  // PHP json_encode turns an empty map into [] — treat as "no customisation"
  if (Array.isArray(modules)) return { version: 1, modules: {} };
  if (!modules || typeof modules !== "object") return null;

  const clean: WidgetLayout["modules"] = {};
  for (const [moduleId, slots] of Object.entries(modules)) {
    if (!slots || typeof slots !== "object" || Array.isArray(slots)) continue;
    const cleanSlots: Partial<Record<WidgetSlotName, string[]>> = {};
    for (const [slot, ids] of Object.entries(slots as Record<string, unknown>)) {
      if (!SLOT_NAMES.has(slot) || !Array.isArray(ids)) continue;
      cleanSlots[slot as WidgetSlotName] = ids.filter((id): id is string => typeof id === "string");
    }
    if (Object.keys(cleanSlots).length) clean[moduleId] = cleanSlots;
  }
  return { version: 1, modules: clean };
}

function readCache(): WidgetLayout | null {
  try {
    return parseWidgetLayout(localStorage.getItem(LS_KEY));
  } catch {
    return null;
  }
}

function writeCache(layout: WidgetLayout | null): void {
  try {
    if (layout) localStorage.setItem(LS_KEY, JSON.stringify(layout));
    else localStorage.removeItem(LS_KEY);
  } catch {
    // storage full / private mode — cache is best-effort
  }
}

const [layout, setLayout] = createSignal<WidgetLayout | null>(readCache());

// UI state: whether the sidebar is in widget-edit mode (toggled from Layout's
// pencil button, consumed by Slot). Session-only, never persisted.
const [editingWidgets, setEditingWidgets] = createSignal(false);
export { editingWidgets, setEditingWidgets };

export function useWidgetLayout() {
  return layout;
}

// The user's list for a module+slot, or null when the defaults apply
export function layoutFor(moduleId: string, slot: WidgetSlotName): string[] | null {
  return layout()?.modules[moduleId]?.[slot] ?? null;
}

// ── Page-owner layout ─────────────────────────────────────────────────────────
// The visited channel owner's layout, so visitors see their pages arranged as
// the owner set them. Fed by useChannelTheme's per-channel prefs fetch; cleared
// (null) when leaving channel pages. Never persisted on this device.

const [pageLayout, setPageLayout] = createSignal<WidgetLayout | null>(null);

export function initPageWidgetLayout(raw: string | null | undefined): void {
  setPageLayout(raw ? parseWidgetLayout(raw) : null);
}

// The page owner's list for a module+slot, or null when the defaults apply
export function pageLayoutFor(moduleId: string, slot: WidgetSlotName): string[] | null {
  return pageLayout()?.modules[moduleId]?.[slot] ?? null;
}

// Called from auth-store with the pconfig value at boot — the server wins,
// including its absence (a reset on another device must clear this one's cache).
export function initWidgetLayout(raw: string | undefined): void {
  const parsed = raw !== undefined ? parseWidgetLayout(raw) : null;
  setLayout(parsed);
  writeCache(parsed);
}

// Optimistic save; pass null to reset every page to defaults.
// Returns false (and rolls back) when the server rejects the write.
export async function saveWidgetLayout(next: WidgetLayout | null): Promise<boolean> {
  const prev = layout();
  setLayout(next);
  writeCache(next);
  try {
    const res = await apiFetch("/api/widget-layout", {
      method: "POST",
      body: JSON.stringify({ layout: next }),
    });
    if (!res.ok) throw new Error(`widget-layout save failed: ${res.status}`);
    return true;
  } catch {
    setLayout(prev);
    writeCache(prev);
    return false;
  }
}

// Replace one module+slot list (null removes the override so defaults apply again)
export function saveSlotLayout(
  moduleId: string,
  slot: WidgetSlotName,
  ids: string[] | null,
): Promise<boolean> {
  const current = layout() ?? { version: 1 as const, modules: {} };
  const moduleSlots = { ...current.modules[moduleId] };
  if (ids === null) delete moduleSlots[slot];
  else moduleSlots[slot] = ids;

  const modules = { ...current.modules };
  if (Object.keys(moduleSlots).length) modules[moduleId] = moduleSlots;
  else delete modules[moduleId];

  const next: WidgetLayout | null = Object.keys(modules).length
    ? { version: 1, modules }
    : null;
  return saveWidgetLayout(next);
}
