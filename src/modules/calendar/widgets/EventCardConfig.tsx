// Settings form for EventCardWidget instances: pick one of the channel's
// upcoming events (default feed window).

import { createResource, createSignal, For } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import { fetchEvents } from "../api";

export default function EventCardConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const [uri, setUri] = createSignal(String(props.config.uri ?? ""));

  const [events] = createResource(() => nick() || null, (n) => fetchEvents(n));

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_event")}
        <select
          value={uri()}
          onChange={(e) => setUri(e.currentTarget.value)}
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
        >
          <option value="">—</option>
          <For each={events() ?? []}>
            {(ev) => (
              <option value={ev.uri}>
                {ev.title || t("widgets.cfg_event")} — {ev.start.slice(0, 10)}
              </option>
            )}
          </For>
        </select>
      </label>
      <button
        onClick={() => props.onSave({ uri: uri() })}
        disabled={!uri()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
