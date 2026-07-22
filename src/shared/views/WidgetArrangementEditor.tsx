import { type Component, For, Show } from "solid-js";
import { getLazy, type RegisteredWidget } from "@/shared/lib/module-registry";
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

// A layout entry resolved against the registry: the widget definition plus
// the instance key/config it is mounted with. Singleton widgets use their
// widget id as the key.
export interface ResolvedEntry {
  widget: RegisteredWidget;
  key: string;
  config?: Record<string, unknown>;
}

export function widgetLabel(w: RegisteredWidget): string {
  return typeof w.label === "function" ? w.label() : w.label;
}

export function widgetHelpTarget(w: RegisteredWidget): string {
  return w.helpTarget ?? `widgets.${w.id}`;
}

interface WidgetArrangementEditorProps {
  entries: ResolvedEntry[];
  availableWidgets: RegisteredWidget[];
  pickerOpen: boolean;
  onTogglePicker: () => void;
  configOpenKey: string | null;
  onToggleConfig: (key: string) => void;
  onMove: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onAdd: (widget: RegisteredWidget) => void;
  onSaveConfig: (index: number, config: Record<string, unknown>) => void;
  /** Omit to hide the reset button entirely (e.g. templates have no "default" to revert to). */
  onReset?: () => void;
  /** Applied to each row's wrapper, e.g. Slot's mainTop masonry class. Defaults to none. */
  itemClass?: string;
}

// The editable widget-list UI shared by <Slot editable> (editing a page's own
// layout override) and the Layout Templates screen (editing a named,
// reusable template) — same move/remove/configure/add-widget/reset chrome,
// bound to whichever persistence the caller supplies via the callbacks.
const WidgetArrangementEditor: Component<WidgetArrangementEditorProps> = (props) => {
  const { t } = useI18n();
  const itemClass = () => props.itemClass ?? "";

  const editButtonClass =
    "p-1 rounded-md text-muted hover:text-txt hover:bg-elevated transition-colors " +
    "disabled:opacity-30 disabled:pointer-events-none";

  return (
    <>
      <Show when={props.entries.length === 0}>
        <p class="text-xs text-muted px-1">{t("widgets.empty_slot")}</p>
      </Show>

      <For each={props.entries}>
        {(entry, index) => {
          const Widget = getLazy(entry.widget.loader);
          const configOpen = () => props.configOpenKey === entry.key;
          const ConfigForm = entry.widget.configComponent
            ? getLazy(entry.widget.configComponent)
            : null;
          return (
            <div
              class={`rounded-xl border border-dashed border-accent/50 overflow-hidden ${itemClass()}`}
              use:helpable={widgetHelpTarget(entry.widget)}
            >
              <div class="flex items-center justify-between gap-1 px-2 py-1 bg-elevated">
                <span class="text-xs font-medium truncate">{widgetLabel(entry.widget)}</span>
                <div class="flex items-center shrink-0">
                  <Show when={ConfigForm}>
                    <button
                      onClick={() => props.onToggleConfig(entry.key)}
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
                    onClick={() => props.onMove(index(), -1)}
                    disabled={index() === 0}
                    aria-label={t("widgets.move_up")}
                    title={t("widgets.move_up")}
                    class={editButtonClass}
                  >
                    <MdFillKeyboard_arrow_up size={16} />
                  </button>
                  <button
                    onClick={() => props.onMove(index(), 1)}
                    disabled={index() === props.entries.length - 1}
                    aria-label={t("widgets.move_down")}
                    title={t("widgets.move_down")}
                    class={editButtonClass}
                  >
                    <MdFillKeyboard_arrow_down size={16} />
                  </button>
                  <button
                    onClick={() => props.onRemove(index())}
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
                        onSave={(config) => props.onSaveConfig(index(), config)}
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

      <div class={`space-y-2 ${itemClass()}`}>
        <button
          onClick={props.onTogglePicker}
          aria-expanded={props.pickerOpen}
          class="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl
                 border border-dashed border-rim text-xs font-medium text-muted
                 hover:text-txt hover:bg-elevated transition-colors"
        >
          <MdFillAdd size={14} />
          {t("widgets.add_widget")}
        </button>

        <Show when={props.pickerOpen}>
          <Show
            when={props.availableWidgets.length > 0}
            fallback={<p class="text-xs text-muted px-1">{t("widgets.none_to_add")}</p>}
          >
            <div class="flex flex-col gap-1">
              <For each={props.availableWidgets}>
                {(widget) => (
                  <button
                    onClick={() => props.onAdd(widget)}
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

        <Show when={props.onReset}>
          {(onReset) => (
            <button
              onClick={() => onReset()()}
              class="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl
                     text-xs font-medium text-muted
                     hover:text-txt hover:bg-elevated transition-colors"
            >
              <MdFillRefresh size={14} />
              {t("widgets.reset_layout")}
            </button>
          )}
        </Show>
      </div>
    </>
  );
};

export default WidgetArrangementEditor;
