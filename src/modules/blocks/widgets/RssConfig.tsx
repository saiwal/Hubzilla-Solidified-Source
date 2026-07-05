// Settings form for RssWidget instances: feed URL + how many items to show.

import { createSignal, For } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { useI18n } from "@/i18n";

const COUNTS = [3, 5, 10];

export default function RssConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const [url, setUrl] = createSignal(String(props.config.url ?? ""));
  const [count, setCount] = createSignal(Number(props.config.count ?? 5));

  const valid = () => /^https?:\/\/.+/.test(url().trim());

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_feed_url")}
        <input
          type="url"
          value={url()}
          onInput={(e) => setUrl(e.currentTarget.value)}
          placeholder="https://example.com/feed.xml"
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
        />
      </label>
      <label class="text-xs text-muted">
        {t("widgets.cfg_item_count")}
        <select
          value={String(count())}
          onChange={(e) => setCount(Number(e.currentTarget.value))}
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
        >
          <For each={COUNTS}>{(n) => <option value={String(n)}>{n}</option>}</For>
        </select>
      </label>
      <button
        onClick={() => props.onSave({ url: url().trim(), count: count() })}
        disabled={!valid()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
