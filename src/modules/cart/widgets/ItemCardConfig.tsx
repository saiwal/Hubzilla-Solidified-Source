// Settings form for ItemCardWidget instances: pick which catalog item the
// card shows. Rendered in Slot's edit-mode config panel (owner only).

import { createResource, createSignal, For } from "solid-js";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import { fetchCatalog } from "../api";

export default function ItemCardConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const [sku, setSku] = createSignal(String(props.config.sku ?? ""));

  const [catalog] = createResource(() => nick() || null, fetchCatalog);

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_item")}
        <select
          value={sku()}
          onChange={(e) => setSku(e.currentTarget.value)}
          class="mt-1 w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt"
        >
          <option value="">—</option>
          <For each={catalog() ?? []}>
            {(item) => (
              <option value={item.sku}>
                {item.desc} — {item.price}
              </option>
            )}
          </For>
        </select>
      </label>
      <button
        onClick={() => props.onSave({ sku: sku() })}
        disabled={!sku()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
