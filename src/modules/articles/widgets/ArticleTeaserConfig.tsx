// Settings form for ArticleTeaserWidget instances: pick one of the channel's
// articles.

import { createResource, createSignal, For } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import { fetchArticles } from "../api";

export default function ArticleTeaserConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const [uuid, setUuid] = createSignal(String(props.config.uuid ?? ""));

  const [articles] = createResource(
    () => nick() || null,
    async (n) => (await fetchArticles(n)).articles,
  );

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_article")}
        <select
          value={uuid()}
          onChange={(e) => setUuid(e.currentTarget.value)}
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
        >
          <option value="">—</option>
          <For each={articles() ?? []}>
            {(a) => <option value={a.uuid}>{a.title || a.created.slice(0, 10)}</option>}
          </For>
        </select>
      </label>
      <button
        onClick={() => props.onSave({ uuid: uuid() })}
        disabled={!uuid()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
