import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import {
  resolveModuleSlot,
  resolveGlobalSlots,
  getWidget,
  getAllWidgets,
  getLazy,
  getWidgetVersion,
  isModuleActive,
  moduleIdForPath,
  widgetAllowedIn,
  widgetSlots,
  type RegisteredWidget,
} from "@/shared/lib/module-registry";
import { useInstalledApps } from "@/shared/store/nav-store";
import { useViewerRole } from "@/shared/store/site-config";
import {
  layoutFor,
  pageLayoutFor,
  saveSlotLayout,
  editingWidgets,
  entryId,
  entryKey,
  entryConfig,
  makeInstanceKey,
  type LayoutEntry,
} from "@/shared/store/widget-layout";
import {
  templateEntriesFor,
  pageTemplateEntriesFor,
  saveTemplateSlots,
  templateName,
  templateUsageCount,
} from "@/shared/store/widget-templates";
import { toast } from "@/shared/store/toast";
import { helpable } from "@/shared/lib/helpable";
void helpable;
import { useI18n } from "@/i18n";
import WidgetArrangementEditor, { widgetHelpTarget, type ResolvedEntry } from "./WidgetArrangementEditor";
import type { WidgetSlotName } from "../types/module.types";

interface SlotProps {
  name: WidgetSlotName;
  moduleId?: string;
  /** Allow the user to rearrange this slot while widget-edit mode is on. */
  editable?: boolean;
  /** When set, this slot's widgets come from the named layout template
   * instead of the module-level layout (see ModuleDef.pageTemplate) — the
   * item currently shown has been assigned this template. Widget eligibility
   * (isModuleActive/resolveModuleSlot/widgetAllowedIn) still uses moduleId;
   * only the override source changes. Editing here saves to the template
   * (saveTemplateSlots) instead of the page/module layout — since a
   * template can be assigned to multiple items, edits apply everywhere it's
   * used (see the "shared by N" notice in edit mode). */
  templateId?: string;
}

const Slot: Component<SlotProps> = (props) => {
  const location = useLocation();
  const installedApps = useInstalledApps();
  const viewerRole = useViewerRole();
  const { t } = useI18n();

  const activeModuleId = () => {
    if (props.moduleId) return props.moduleId;
    return moduleIdForPath(location.pathname);
  };

  // On your own pages your layout applies; on someone else's channel pages
  // (and for visitors) the page owner's layout applies.
  const isPageOwner = () => viewerRole() === "owner";

  // Authenticated local user (any page) — widgets with visitorVisible: false
  // only render for these viewers
  const isLocalViewer = () => viewerRole() === "owner" || viewerRole() === "local";
  const visibleToViewer = (w: RegisteredWidget) => w.visitorVisible !== false || isLocalViewer();

  const widgetVersion = getWidgetVersion();
  // Reactive: re-derives when new modules register widgets after async import
  const globalWidgets = createMemo(() => {
    widgetVersion(); // track
    return resolveGlobalSlots(props.name)
      .filter(visibleToViewer)
      .map((w) => ({ widget: w, Widget: getLazy(w.loader) }));
  });

  // Module-local widgets: the user's saved layout when one exists, otherwise
  // registry defaults. Stored entries that point at unknown, global, disallowed,
  // or uninstalled-app widgets are silently dropped — layouts outlive code.
  // Resolved entries are reference-stable across recomputes (keyed by instance
  // key + config) so <For> doesn't remount unchanged widgets.
  let entryCache = new Map<string, ResolvedEntry>();
  const localEntries = createMemo<ResolvedEntry[]>(() => {
    widgetVersion(); // track
    const moduleId = activeModuleId();
    const apps = installedApps();
    if (!isModuleActive(moduleId, apps)) return [];

    const custom = props.templateId
      ? (isPageOwner() ? templateEntriesFor : pageTemplateEntriesFor)(props.templateId, props.name)
      : (isPageOwner() ? layoutFor(moduleId, props.name) : pageLayoutFor(moduleId, props.name));

    let resolved: ResolvedEntry[];
    if (custom) {
      resolved = [];
      const seen = new Set<string>();
      for (const entry of custom) {
        const w = getWidget(entryId(entry));
        if (
          !w ||
          w.global ||
          !widgetAllowedIn(w, moduleId) ||
          !isModuleActive(w.moduleId, apps) ||
          !visibleToViewer(w) ||
          seen.has(entryKey(entry))
        ) continue;
        seen.add(entryKey(entry));
        resolved.push({ widget: w, key: entryKey(entry), config: entryConfig(entry) });
      }
    } else {
      resolved = resolveModuleSlot(props.name, moduleId)
        .filter((w) => isModuleActive(w.moduleId, apps) && visibleToViewer(w))
        .map((w) => ({ widget: w, key: w.id }));
    }

    // Reuse previous entry objects when nothing about them changed
    const next = new Map<string, ResolvedEntry>();
    const out = resolved.map((e) => {
      const cacheKey = `${e.key}|${JSON.stringify(e.config ?? null)}`;
      const prev = entryCache.get(cacheKey);
      const stable = prev && prev.widget === e.widget ? prev : e;
      next.set(cacheKey, stable);
      return stable;
    });
    entryCache = next;
    return out;
  });

  // ── Edit mode ───────────────────────────────────────────────────────────────

  // Editing only applies to your own layout, on your own pages. When this
  // slot is templated, editing still applies here directly (same pencil,
  // same in-place UI as any module) — it just saves to the template.
  const editing = () => props.editable === true && editingWidgets() && isPageOwner();

  const persist = async (entries: LayoutEntry[] | null) => {
    const ok = props.templateId
      ? await saveTemplateSlots(props.templateId, props.name, entries ?? [])
      : await saveSlotLayout(activeModuleId(), props.name, entries);
    if (!ok) toast.error(t("widgets.save_failed"));
  };

  // The current arrangement in persistable form: plain id for singletons,
  // instance object otherwise
  const currentEntries = (): LayoutEntry[] =>
    localEntries().map((e) =>
      e.key === e.widget.id && e.config === undefined
        ? e.widget.id
        : { id: e.widget.id, key: e.key, ...(e.config !== undefined ? { config: e.config } : {}) },
    );

  const move = (index: number, delta: number) => {
    const entries = [...currentEntries()];
    const target = index + delta;
    if (target < 0 || target >= entries.length) return;
    [entries[index], entries[target]] = [entries[target], entries[index]];
    void persist(entries);
  };

  const removeAt = (index: number) => {
    const entries = [...currentEntries()];
    entries.splice(index, 1);
    void persist(entries);
  };

  const addWidget = (w: RegisteredWidget) => {
    const entry: LayoutEntry = w.multiInstance
      ? { id: w.id, key: makeInstanceKey(w.id) }
      : w.id;
    void persist([...currentEntries(), entry]);
  };

  const saveConfig = (index: number, config: Record<string, unknown>) => {
    const entries = [...currentEntries()];
    const e = entries[index];
    if (e === undefined) return;
    entries[index] = { id: entryId(e), key: entryKey(e), config };
    void persist(entries);
    setConfigOpenKey(null);
  };

  // No "revert to default" concept once a slot belongs to a template — a
  // template is an explicit, non-default arrangement by design, and nothing
  // in WidgetTemplates.php ever un-sets a slot key back to "absent" once
  // saved (only to []). Removing widgets one at a time covers "make it empty".
  const isCustomised = () => !props.templateId && layoutFor(activeModuleId(), props.name) !== null;

  // Widgets the user could add here: same slot, allowed in this module,
  // backing app installed, not global, not already present (multiInstance
  // widgets stay available — each add creates a new instance)
  const availableWidgets = createMemo<RegisteredWidget[]>(() => {
    if (!editing()) return [];
    widgetVersion(); // track
    const moduleId = activeModuleId();
    const apps = installedApps();
    const present = new Set(localEntries().map((e) => e.widget.id));
    return getAllWidgets().filter(
      (w) =>
        !w.global &&
        widgetSlots(w).includes(props.name) &&
        (w.multiInstance === true || !present.has(w.id)) &&
        widgetAllowedIn(w, moduleId) &&
        isModuleActive(w.moduleId, apps),
    );
  });

  const [pickerOpen, setPickerOpen] = createSignal(false);
  // Instance key of the entry whose config panel is open (one at a time)
  const [configOpenKey, setConfigOpenKey] = createSignal<string | null>(null);

  // mainTop is a banner strip, not a sidebar: lay its widgets out
  // masonry-style instead of stacking them full-width. A CSS grid would pad
  // every cell in a row up to its tallest neighbour — with widgets of very
  // different heights (a heatmap vs. a one-line quote, or a tall messages
  // panel vs. a short stats card) that reads as a grid full of dead space,
  // not a packed layout. CSS columns avoid that: each item flows into the
  // next slot in its column at its own height.
  //
  // header (above mainTop) and footer (below all page content) are always
  // full-width, single-column — for banner-like widgets (e.g. a horizontal
  // nav menu) that must span the whole row rather than pack into a column.
  //
  // All three need their own margin and a conditional wrapper (the
  // surrounding <main> has no space-y, unlike the sidebar <aside>). Other
  // slots return the bare content and rely on their parent's spacing.
  const isMainTop = props.name === "mainTop";
  const isFullWidth = props.name === "header" || props.name === "footer";
  const hasContent = createMemo(
    () => globalWidgets().length > 0 || localEntries().length > 0 || editing(),
  );
  const itemClass = () => (isMainTop ? "break-inside-avoid mb-4" : "");

  const content = (
    <>
      {/* Always mounted — never torn down on module navigation */}
      <For each={globalWidgets()}>
        {(g) => (
          <div class={itemClass()} use:helpable={widgetHelpTarget(g.widget)}>
            <g.Widget />
          </div>
        )}
      </For>

      {/* Swapped per active module */}
      <Show
        when={editing()}
        fallback={
          <For each={localEntries()}>
            {(entry) => {
              const Widget = getLazy(entry.widget.loader);
              return (
                <div class={itemClass()} use:helpable={widgetHelpTarget(entry.widget)}>
                  <Widget config={entry.config} />
                </div>
              );
            }}
          </For>
        }
      >
        <Show when={props.templateId && templateUsageCount(props.templateId) > 1}>
          <p class="text-xs text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5 mb-2">
            {t("widgets.template_shared_notice")
              .replace("{{name}}", templateName(props.templateId!) ?? "")
              .replace("{{count}}", String(templateUsageCount(props.templateId!)))}
          </p>
        </Show>
        <WidgetArrangementEditor
          entries={localEntries()}
          availableWidgets={availableWidgets()}
          pickerOpen={pickerOpen()}
          onTogglePicker={() => setPickerOpen((o) => !o)}
          configOpenKey={configOpenKey()}
          onToggleConfig={(key) => setConfigOpenKey(configOpenKey() === key ? null : key)}
          onMove={move}
          onRemove={removeAt}
          onAdd={addWidget}
          onSaveConfig={saveConfig}
          onReset={isCustomised() ? () => void persist(null) : undefined}
          itemClass={itemClass()}
        />
      </Show>
    </>
  );

  if (isFullWidth) {
    const marginClass = props.name === "footer" ? "mt-3" : "mb-4";
    return (
      <Show when={hasContent()}>
        <div class={`space-y-4 ${marginClass}`}>
          {content}
        </div>
      </Show>
    );
  }

  if (!isMainTop) {
    return content;
  }

  return (
    <Show when={hasContent()}>
      <div class="columns-1 sm:columns-2 lg:columns-4 gap-4 mb-4">
        {content}
      </div>
    </Show>
  );
};

export default Slot;
