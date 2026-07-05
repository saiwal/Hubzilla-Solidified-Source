// Settings form for HtmlBlockWidget instances: optional title + HTML content.
// Kept well under the server's 2 KB per-instance config cap.

import { createSignal } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { useI18n } from "@/i18n";

const MAX_HTML = 1800;

export default function HtmlBlockConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const [title, setTitle] = createSignal(String(props.config.title ?? ""));
  const [html, setHtml] = createSignal(String(props.config.html ?? ""));

  const save = () => {
    const config: Record<string, unknown> = { html: html() };
    if (title().trim()) config.title = title().trim();
    props.onSave(config);
  };

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_title")}
        <input
          type="text"
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          maxLength={100}
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
        />
      </label>
      <label class="text-xs text-muted">
        {t("widgets.cfg_html")}
        <textarea
          value={html()}
          onInput={(e) => setHtml(e.currentTarget.value)}
          maxLength={MAX_HTML}
          rows={6}
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt
                 font-mono resize-y"
        />
      </label>
      <div class="flex items-center justify-between gap-2">
        <span class="text-[10px] text-muted">
          {t("widgets.cfg_html_hint")} ({html().length}/{MAX_HTML})
        </span>
        <button
          onClick={save}
          disabled={!html().trim()}
          class="px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
                 hover:brightness-110 transition-all disabled:opacity-40"
        >
          {t("widgets.cfg_save")}
        </button>
      </div>
    </div>
  );
}
