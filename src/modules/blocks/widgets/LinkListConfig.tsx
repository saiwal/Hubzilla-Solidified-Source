// Settings form for LinkListWidget instances: optional title + up to 8
// label/url rows. Save is blocked when the config would exceed the server's
// 2 KB per-instance cap.

import { createSignal, Index, Show } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { useI18n } from "@/i18n";
import { MdFillAdd, MdFillClose } from "solid-icons/md";

interface Row {
  label: string;
  url: string;
}

const MAX_LINKS = 20;
const MAX_CONFIG_CHARS = 1900;

const inputClass =
  "w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt";

export default function LinkListConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const initial = Array.isArray(props.config.links)
    ? (props.config.links as Row[]).map((l) => ({ label: String(l?.label ?? ""), url: String(l?.url ?? "") }))
    : [];
  const [title, setTitle] = createSignal(String(props.config.title ?? ""));
  const [rows, setRows] = createSignal<Row[]>(initial.length ? initial : [{ label: "", url: "" }]);

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const addRow = () => setRows((prev) => [...prev, { label: "", url: "" }]);

  const cleanConfig = (): Record<string, unknown> => {
    const links = rows()
      .map((r) => ({ label: r.label.trim(), url: r.url.trim() }))
      .filter((r) => /^https?:\/\//i.test(r.url));
    const config: Record<string, unknown> = { links };
    if (title().trim()) config.title = title().trim();
    return config;
  };

  const size = () => JSON.stringify(cleanConfig()).length;
  const linkCount = () => (cleanConfig().links as Row[]).length;
  const valid = () => linkCount() > 0 && size() <= MAX_CONFIG_CHARS;

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_title")}
        <input type="text" value={title()} maxLength={60}
               onInput={(e) => setTitle(e.currentTarget.value)} class={`mt-1 ${inputClass}`} />
      </label>

      <span class="text-xs text-muted">{t("widgets.cfg_links")}</span>
      {/* Index (not For): rows are recreated objects on every keystroke, and
          For would rebuild the DOM row — dropping focus from the input */}
      <Index each={rows()}>
        {(row, i) => (
          <div class="flex items-center gap-1">
            <input
              type="text"
              placeholder={t("widgets.cfg_link_label")}
              value={row().label}
              maxLength={60}
              onInput={(e) => setRow(i, { label: e.currentTarget.value })}
              class={inputClass}
              style={{ "max-width": "35%" }}
            />
            <input
              type="url"
              placeholder="https://…"
              value={row().url}
              maxLength={200}
              onInput={(e) => setRow(i, { url: e.currentTarget.value })}
              class={inputClass}
            />
            <button
              onClick={() => removeRow(i)}
              aria-label={t("widgets.remove_widget")}
              class="p-1 rounded-md text-muted hover:text-txt hover:bg-elevated transition-colors shrink-0"
            >
              <MdFillClose size={14} />
            </button>
          </div>
        )}
      </Index>

      <Show when={rows().length < MAX_LINKS}>
        <button
          onClick={addRow}
          class="self-start flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted
                 hover:text-txt hover:bg-elevated transition-colors"
        >
          <MdFillAdd size={12} />
          {t("widgets.cfg_add_link")}
        </button>
      </Show>

      <div class="flex items-center justify-between gap-2">
        <Show when={size() > MAX_CONFIG_CHARS}>
          <span class="text-[10px] text-muted">{t("widgets.cfg_too_large")}</span>
        </Show>
        <button
          onClick={() => props.onSave(cleanConfig())}
          disabled={!valid()}
          class="ml-auto px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
                 hover:brightness-110 transition-all disabled:opacity-40"
        >
          {t("widgets.cfg_save")}
        </button>
      </div>
    </div>
  );
}
