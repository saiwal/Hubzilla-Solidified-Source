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
import { toast } from "@/shared/store/toast";
import { helpable } from "@/shared/lib/helpable";
void helpable;
import { useI18n } from "@/i18n";
import {
  MdFillAdd,
  MdFillClose,
  MdFillKeyboard_arrow_up,
  MdFillKeyboard_arrow_down,
  MdFillRefresh,
  MdFillSettings,
} from "solid-icons/md";
import type { WidgetSlotName } from "../types/module.types";

interface SlotProps {
  name: WidgetSlotName;
  moduleId?: string;
  /** Allow the user to rearrange this slot while widget-edit mode is on. */
  editable?: boolean;
}

// A layout entry resolved against the registry: the widget definition plus
// the instance key/config it is mounted with. Singleton widgets use their
// widget id as the key.
interface ResolvedEntry {
  widget: RegisteredWidget;
  key: string;
  config?: Record<string, unknown>;
}

function widgetLabel(w: RegisteredWidget): string {
  return typeof w.label === "function" ? w.label() : w.label;
}

function widgetHelpTarget(w: RegisteredWidget): string {
  return w.helpTarget ?? `widgets.${w.id}`;
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

    const custom = isPageOwner()
      ? layoutFor(moduleId, props.name)
      : pageLayoutFor(moduleId, props.name);

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

  // Editing only applies to your own layout, on your own pages
  const editing = () => props.editable === true && editingWidgets() && isPageOwner();

  const persist = async (entries: LayoutEntry[] | null) => {
    const ok = await saveSlotLayout(activeModuleId(), props.name, entries);
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

  const isCustomised = () => layoutFor(activeModuleId(), props.name) !== null;

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
        w.slot === props.name &&
        (w.multiInstance === true || !present.has(w.id)) &&
        widgetAllowedIn(w, moduleId) &&
        isModuleActive(w.moduleId, apps),
    );
  });

  const [pickerOpen, setPickerOpen] = createSignal(false);
  // Instance key of the entry whose config panel is open (one at a time)
  const [configOpenKey, setConfigOpenKey] = createSignal<string | null>(null);

  const editButtonClass =
    "p-1 rounded-md text-muted hover:text-txt hover:bg-elevated transition-colors " +
    "disabled:opacity-30 disabled:pointer-events-none";

  return (
    <>
      {/* Always mounted — never torn down on module navigation */}
      <For each={globalWidgets()}>
        {(g) => (
          <div use:helpable={widgetHelpTarget(g.widget)}>
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
                <div use:helpable={widgetHelpTarget(entry.widget)}>
                  <Widget config={entry.config} />
                </div>
              );
            }}
          </For>
        }
      >
        <Show when={localEntries().length === 0}>
          <p class="text-xs text-muted px-1">{t("widgets.empty_slot")}</p>
        </Show>

        <For each={localEntries()}>
          {(entry, index) => {
            const Widget = getLazy(entry.widget.loader);
            const configOpen = () => configOpenKey() === entry.key;
            const ConfigForm = entry.widget.configComponent
              ? getLazy(entry.widget.configComponent)
              : null;
            return (
              <div
                class="rounded-xl border border-dashed border-accent/50 overflow-hidden"
                use:helpable={widgetHelpTarget(entry.widget)}
              >
                <div class="flex items-center justify-between gap-1 px-2 py-1 bg-elevated">
                  <span class="text-xs font-medium truncate">{widgetLabel(entry.widget)}</span>
                  <div class="flex items-center shrink-0">
                    <Show when={ConfigForm}>
                      <button
                        onClick={() => setConfigOpenKey(configOpen() ? null : entry.key)}
                        aria-expanded={configOpen()}
                        aria-label={t("widgets.configure_widget")}
                        title={t("widgets.configure_widget")}
                        class={editButtonClass}
                        classList={{ "text-accent": configOpen() }}
                      >
                        <MdFillSettings size={14} />
                      </button>
                    </Show>
                    <button
                      onClick={() => move(index(), -1)}
                      disabled={index() === 0}
                      aria-label={t("widgets.move_up")}
                      title={t("widgets.move_up")}
                      class={editButtonClass}
                    >
                      <MdFillKeyboard_arrow_up size={16} />
                    </button>
                    <button
                      onClick={() => move(index(), 1)}
                      disabled={index() === localEntries().length - 1}
                      aria-label={t("widgets.move_down")}
                      title={t("widgets.move_down")}
                      class={editButtonClass}
                    >
                      <MdFillKeyboard_arrow_down size={16} />
                    </button>
                    <button
                      onClick={() => removeAt(index())}
                      aria-label={t("widgets.remove_widget")}
                      title={t("widgets.remove_widget")}
                      class={editButtonClass}
                    >
                      <MdFillClose size={14} />
                    </button>
                  </div>
                </div>

                {/* Per-instance settings form */}
                <Show when={configOpen() && ConfigForm}>
                  {(Form) => {
                    const F = Form();
                    return (
                      <div class="px-2 py-2 border-t border-rim">
                        <F
                          config={entry.config ?? {}}
                          onSave={(config) => saveConfig(index(), config)}
                        />
                      </div>
                    );
                  }}
                </Show>

                {/* Inert preview — interacting with widgets is disabled while editing */}
                <div class="pointer-events-none opacity-60 p-1" aria-hidden="true">
                  <Widget config={entry.config} />
                </div>
              </div>
            );
          }}
        </For>

        <div class="space-y-2">
          <button
            onClick={() => setPickerOpen((o) => !o)}
            aria-expanded={pickerOpen()}
            class="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl
                   border border-dashed border-rim text-xs font-medium text-muted
                   hover:text-txt hover:bg-elevated transition-colors"
          >
            <MdFillAdd size={14} />
            {t("widgets.add_widget")}
          </button>

          <Show when={pickerOpen()}>
            <Show
              when={availableWidgets().length > 0}
              fallback={<p class="text-xs text-muted px-1">{t("widgets.none_to_add")}</p>}
            >
              <div class="flex flex-col gap-1">
                <For each={availableWidgets()}>
                  {(widget) => (
                    <button
                      onClick={() => addWidget(widget)}
                      class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs
                             bg-elevated border border-rim
                             hover:brightness-95 transition-all"
                    >
                      <MdFillAdd size={12} class="shrink-0 text-muted" />
                      <span class="truncate">{widgetLabel(widget)}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Show>

          <Show when={isCustomised()}>
            <button
              onClick={() => void persist(null)}
              class="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl
                     text-xs font-medium text-muted
                     hover:text-txt hover:bg-elevated transition-colors"
            >
              <MdFillRefresh size={14} />
              {t("widgets.reset_layout")}
            </button>
          </Show>
        </div>
      </Show>
    </>
  );
};

export default Slot;
