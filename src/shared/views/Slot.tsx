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
} from "@/shared/store/widget-layout";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";
import {
  MdFillAdd,
  MdFillClose,
  MdFillKeyboard_arrow_up,
  MdFillKeyboard_arrow_down,
  MdFillRefresh,
} from "solid-icons/md";
import type { WidgetSlotName } from "../types/module.types";

interface SlotProps {
  name: WidgetSlotName;
  moduleId?: string;
  /** Allow the user to rearrange this slot while widget-edit mode is on. */
  editable?: boolean;
}

function widgetLabel(w: RegisteredWidget): string {
  return typeof w.label === "function" ? w.label() : w.label;
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
      .map((w) => getLazy(w.loader));
  });

  // Module-local widgets: the user's saved layout when one exists, otherwise
  // registry defaults. Stored ids that point at unknown, global, disallowed,
  // or uninstalled-app widgets are silently dropped — layouts outlive code.
  const localWidgetDefs = createMemo<RegisteredWidget[]>(() => {
    widgetVersion(); // track
    const moduleId = activeModuleId();
    const apps = installedApps();
    if (!isModuleActive(moduleId, apps)) return [];

    const custom = isPageOwner()
      ? layoutFor(moduleId, props.name)
      : pageLayoutFor(moduleId, props.name);
    if (custom) {
      return custom
        .map(getWidget)
        .filter(
          (w): w is RegisteredWidget =>
            !!w &&
            !w.global &&
            widgetAllowedIn(w, moduleId) &&
            isModuleActive(w.moduleId, apps) &&
            visibleToViewer(w),
        );
    }
    return resolveModuleSlot(props.name, moduleId).filter(
      (w) => isModuleActive(w.moduleId, apps) && visibleToViewer(w),
    );
  });

  const localWidgets = createMemo(() => localWidgetDefs().map((w) => getLazy(w.loader)));

  // ── Edit mode ───────────────────────────────────────────────────────────────

  // Editing only applies to your own layout, on your own pages
  const editing = () => props.editable === true && editingWidgets() && isPageOwner();

  const persist = async (ids: string[] | null) => {
    const ok = await saveSlotLayout(activeModuleId(), props.name, ids);
    if (!ok) toast.error(t("widgets.save_failed"));
  };

  const currentIds = () => localWidgetDefs().map((w) => w.id);

  const move = (index: number, delta: number) => {
    const ids = [...currentIds()];
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    void persist(ids);
  };

  const removeAt = (index: number) => {
    const ids = [...currentIds()];
    ids.splice(index, 1);
    void persist(ids);
  };

  const addWidget = (id: string) => {
    void persist([...currentIds(), id]);
  };

  const isCustomised = () => layoutFor(activeModuleId(), props.name) !== null;

  // Widgets the user could add here: same slot, allowed in this module,
  // backing app installed, not global, not already present
  const availableWidgets = createMemo<RegisteredWidget[]>(() => {
    if (!editing()) return [];
    widgetVersion(); // track
    const moduleId = activeModuleId();
    const apps = installedApps();
    const present = new Set(currentIds());
    return getAllWidgets().filter(
      (w) =>
        !w.global &&
        w.slot === props.name &&
        !present.has(w.id) &&
        widgetAllowedIn(w, moduleId) &&
        isModuleActive(w.moduleId, apps),
    );
  });

  const [pickerOpen, setPickerOpen] = createSignal(false);

  const editButtonClass =
    "p-1 rounded-md text-muted hover:text-txt hover:bg-elevated transition-colors " +
    "disabled:opacity-30 disabled:pointer-events-none";

  return (
    <>
      {/* Always mounted — never torn down on module navigation */}
      <For each={globalWidgets()}>{(Widget) => <Widget />}</For>

      {/* Swapped per active module */}
      <Show
        when={editing()}
        fallback={<For each={localWidgets()}>{(Widget) => <Widget />}</For>}
      >
        <Show when={localWidgetDefs().length === 0}>
          <p class="text-xs text-muted px-1">{t("widgets.empty_slot")}</p>
        </Show>

        <For each={localWidgetDefs()}>
          {(widget, index) => {
            const Widget = getLazy(widget.loader);
            return (
              <div class="rounded-xl border border-dashed border-accent/50 overflow-hidden">
                <div class="flex items-center justify-between gap-1 px-2 py-1 bg-elevated">
                  <span class="text-xs font-medium truncate">{widgetLabel(widget)}</span>
                  <div class="flex items-center shrink-0">
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
                      disabled={index() === localWidgetDefs().length - 1}
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
                {/* Inert preview — interacting with widgets is disabled while editing */}
                <div class="pointer-events-none opacity-60 p-1" aria-hidden="true">
                  <Widget />
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
                      onClick={() => addWidget(widget.id)}
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
