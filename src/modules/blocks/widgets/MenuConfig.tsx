// Shared settings form for MenuBarWidget / MenuTreeWidget instances: pick one
// of the owner's Hubzilla menus (managed under /webpages/:nick/menus or the
// stock Menus app) plus an optional displayed title.

import { createSignal, For, Show } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import type { WidgetConfigProps } from "@/shared/types/module.types";
import { useI18n } from "@/i18n";
import { fetchMyMenus } from "@/shared/lib/menus";

const inputClass =
  "w-full bg-elevated border border-rim rounded-lg px-2 py-1.5 text-xs text-txt";

export default function MenuConfig(props: WidgetConfigProps) {
  const { t } = useI18n();
  const [menu, setMenu] = createSignal(String(props.config.menu ?? ""));
  const [title, setTitle] = createSignal(String(props.config.title ?? ""));

  const [menus] = createQueryResource("my-menus", fetchMyMenus);

  const save = () => {
    const config: Record<string, unknown> = { menu: menu() };
    if (title().trim()) config.title = title().trim();
    props.onSave(config);
  };

  return (
    <div class="flex flex-col gap-2">
      <label class="text-xs text-muted">
        {t("widgets.cfg_menu")}
        <select
          value={menu()}
          onChange={(e) => setMenu(e.currentTarget.value)}
          class={`mt-1 ${inputClass}`}
        >
          <option value="">—</option>
          <For each={menus() ?? []}>
            {(m) => (
              <option value={m.name}>
                {m.desc ? `${m.desc} (${m.name})` : m.name}
              </option>
            )}
          </For>
        </select>
      </label>
      <Show when={!menus.loading && (menus() ?? []).length === 0}>
        <p class="text-[10px] text-muted">{t("widgets.cfg_no_menus")}</p>
      </Show>

      <label class="text-xs text-muted">
        {t("widgets.cfg_title")}
        <input
          type="text"
          value={title()}
          maxLength={60}
          onInput={(e) => setTitle(e.currentTarget.value)}
          class={`mt-1 ${inputClass}`}
        />
      </label>

      <button
        onClick={save}
        disabled={!menu()}
        class="self-end px-3 py-1.5 rounded-lg bg-accent text-accent-fg text-xs font-medium
               hover:brightness-110 transition-all disabled:opacity-40"
      >
        {t("widgets.cfg_save")}
      </button>
    </div>
  );
}
