// Horizontal navigation bar (config: { menu, title? }) fed by one of the page
// owner's Hubzilla menus, for the mainTop slot. Desktop: inline bar with
// click-to-open dropdowns for submenu items (items linking "menu:<name>").
// Below md it collapses into a hamburger toggle over the shared accordion.

import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { createMediaQuery } from "@solid-primitives/media";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import type { WidgetProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { editingWidgets } from "@/shared/store/widget-layout";
import { useI18n } from "@/i18n";
import { MdFillClose, MdFillExpand_more, MdFillMenu } from "solid-icons/md";
import { fetchMenuTree } from "@/shared/lib/menus";
import { MenuAccordion, MenuLink } from "./menu-shared";

const topItemClass =
  "flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-txt rounded-lg " +
  "hover:bg-elevated hover:text-accent transition-colors";

function EditHint(props: { text: string }) {
  return (
    <Show when={editingWidgets()}>
      <div class="bg-surface border border-rim rounded-xl px-4 py-3">
        <p class="text-xs text-muted">{props.text}</p>
      </div>
    </Show>
  );
}

export default function MenuBarWidget(props: WidgetProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const menuName = () => String(props.config?.menu ?? "");
  const title = () => String(props.config?.title ?? "");
  const isDesktop = createMediaQuery("(min-width: 768px)");

  const [tree] = createQueryResource(
    "menu-tree",
    () => (nick() && menuName() ? { nick: nick(), name: menuName() } : null),
    (p) => fetchMenuTree(p.nick, p.name),
  );

  const [openTop, setOpenTop] = createSignal<number | null>(null);
  const [mobileOpen, setMobileOpen] = createSignal(false);

  let rootEl: HTMLElement | undefined;
  onMount(() => {
    const close = (e: MouseEvent) => {
      if (rootEl && !rootEl.contains(e.target as Node)) setOpenTop(null);
    };
    document.addEventListener("click", close);
    onCleanup(() => document.removeEventListener("click", close));
  });

  return (
    <Show when={menuName()} fallback={<EditHint text={t("widgets.not_configured")} />}>
      <Show when={!tree.error} fallback={<EditHint text={t("widgets.item_unavailable")} />}>
        <Show when={tree()?.items.length}>
          <Show
            when={isDesktop()}
            fallback={
              <nav class="bg-surface border border-rim rounded-xl overflow-hidden">
                <button
                  onClick={() => setMobileOpen(!mobileOpen())}
                  aria-expanded={mobileOpen()}
                  class="w-full flex items-center justify-between px-4 py-2.5 text-sm
                         font-semibold text-txt hover:bg-elevated transition-colors"
                >
                  <span class="truncate">{title() || tree()!.desc || tree()!.name}</span>
                  <Show when={mobileOpen()} fallback={<MdFillMenu size={18} class="shrink-0" />}>
                    <MdFillClose size={18} class="shrink-0" />
                  </Show>
                </button>
                <Show when={mobileOpen()}>
                  <div class="border-t border-rim p-1.5">
                    <MenuAccordion items={tree()!.items} onNavigate={() => setMobileOpen(false)} />
                  </div>
                </Show>
              </nav>
            }
          >
            <nav
              ref={rootEl}
              class="bg-surface border border-rim rounded-xl px-2 py-1.5 flex items-center gap-1 flex-wrap"
            >
              <Show when={title()}>
                <span class="px-2 text-sm font-semibold text-txt">{title()}</span>
              </Show>
              <For each={tree()!.items}>
                {(item, i) => (
                  <Show
                    when={item.items?.length}
                    fallback={<MenuLink item={item} class={topItemClass} />}
                  >
                    <div class="relative">
                      <button
                        onClick={() => setOpenTop(openTop() === i() ? null : i())}
                        aria-expanded={openTop() === i()}
                        class={topItemClass}
                      >
                        <span class="truncate">{item.label}</span>
                        <MdFillExpand_more
                          size={16}
                          class={`shrink-0 text-muted transition-transform ${openTop() === i() ? "rotate-180" : ""}`}
                        />
                      </button>
                      <Show when={openTop() === i()}>
                        <div
                          class="absolute left-0 top-full mt-1 w-56 bg-surface border border-rim
                                 rounded-xl shadow-lg z-30 p-1.5"
                        >
                          <MenuAccordion items={item.items!} onNavigate={() => setOpenTop(null)} />
                        </div>
                      </Show>
                    </div>
                  </Show>
                )}
              </For>
            </nav>
          </Show>
        </Show>
      </Show>
    </Show>
  );
}
