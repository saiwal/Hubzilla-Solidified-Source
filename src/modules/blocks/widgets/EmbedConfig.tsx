// Settings form for EmbedWidget instances: URL, optional title, height.

import { createSignal, Show } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { useI18n } from "@/i18n";

const inputClass =
  "mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt";

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function EmbedConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const [url, setUrl] = createSignal(String(props.config.url ?? ""));
  const [title, setTitle] = createSignal(String(props.config.title ?? ""));
  const [height, setHeight] = createSignal(Number(props.config.height ?? 300));

  const valid = () => isValidUrl(url().trim());

  const save = () => {
    const config: Record<string, unknown> = { url: url().trim(), height: height() };
    if (title().trim()) config.title = title().trim();
    props.onSave(config);
  };

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_embed_url")}
        <input
          type="url"
          value={url()}
          onInput={(e) => setUrl(e.currentTarget.value)}
          placeholder="https://www.youtube.com/embed/..."
          class={inputClass}
        />
      </label>
      <Show when={url() && !valid()}>
        <p class="text-[11px] text-red-500">{t("widgets.cfg_invalid_url")}</p>
      </Show>
      <label class="text-xs text-muted">
        {t("widgets.cfg_title")}
        <input
          type="text"
          value={title()}
          maxLength={100}
          onInput={(e) => setTitle(e.currentTarget.value)}
          class={inputClass}
        />
      </label>
      <label class="text-xs text-muted">
        {t("widgets.cfg_embed_height")}
        <input
          type="number"
          min={100}
          max={800}
          step={10}
          value={height()}
          onInput={(e) => setHeight(Number(e.currentTarget.value))}
          class={inputClass}
        />
      </label>
      <button
        onClick={save}
        disabled={!valid()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
