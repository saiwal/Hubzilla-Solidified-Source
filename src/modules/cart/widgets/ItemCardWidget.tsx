// Showcase card for one shop item, chosen per instance via the widget config
// panel (config: { sku }). multiInstance — a channel can place several cards.

import { createResource, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import type { WidgetProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { editingWidgets } from "@/shared/store/widget-layout";
import { toast } from "@/shared/store/toast";
import { useI18n } from "@/i18n";
import { MdFillAdd_shopping_cart, MdFillShopping_cart } from "solid-icons/md";
import { fetchCatalog, addItem, type CatalogItem } from "../api";

// One catalog fetch per channel per session, shared by every card instance
const catalogCache = new Map<string, Promise<CatalogItem[]>>();
function cachedCatalog(nick: string): Promise<CatalogItem[]> {
  if (!catalogCache.has(nick)) {
    const p = fetchCatalog(nick).catch((err) => {
      catalogCache.delete(nick); // don't cache failures
      throw err;
    });
    catalogCache.set(nick, p);
  }
  return catalogCache.get(nick)!;
}

// Placeholder shown in edit mode when the instance isn't usable yet;
// visitors see nothing instead
function EditHint(props: { text: string }) {
  return (
    <Show when={editingWidgets()}>
      <div class="bg-surface border border-rim rounded-xl px-4 py-3">
        <p class="text-xs text-muted">{props.text}</p>
      </div>
    </Show>
  );
}

export default function ItemCardWidget(props: WidgetProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const sku = () => String(props.config?.sku ?? "");

  const [catalog] = createResource(
    () => (nick() && sku() ? nick() : null),
    (n) => cachedCatalog(n),
  );

  const item = () => catalog()?.find((i) => i.sku === sku()) ?? null;

  // After a successful add the button becomes a "view cart" link
  const [added, setAdded] = createSignal(false);

  const onAdd = async () => {
    try {
      await addItem(nick(), sku());
      setAdded(true);
      toast.success(t("widgets.added_to_cart"));
    } catch {
      toast.error(t("widgets.load_error"));
    }
  };

  return (
    <Show when={sku()} fallback={<EditHint text={t("widgets.not_configured")} />}>
      <Show when={catalog.loading}>
        <div class="bg-surface border border-rim rounded-xl overflow-hidden animate-pulse">
          <div class="h-32 bg-elevated" />
          <div class="p-4 space-y-2">
            <div class="h-3 bg-elevated rounded w-3/4" />
            <div class="h-3 bg-elevated rounded w-1/3" />
          </div>
        </div>
      </Show>

      <Show when={!catalog.loading}>
        <Show when={item()} fallback={<EditHint text={t("widgets.item_unavailable")} />}>
          {(it) => (
            <div class="bg-surface border border-rim rounded-xl overflow-hidden">
              <Show when={it().photo_url}>
                <img
                  src={it().photo_url!}
                  alt={it().desc}
                  class="w-full h-32 object-cover"
                  loading="lazy"
                />
              </Show>
              <div class="p-4 flex flex-col gap-2">
                <p class="text-sm font-medium text-txt">{it().desc}</p>
                <p class="text-sm font-semibold text-accent">{it().price}</p>
                <Show
                  when={added()}
                  fallback={
                    <button
                      onClick={() => void onAdd()}
                      class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-accent text-accent-fg text-xs font-medium
                             hover:brightness-110 transition-all"
                    >
                      <MdFillAdd_shopping_cart size={14} />
                      {t("cart.add_to_cart")}
                    </button>
                  }
                >
                  <A
                    href={`/cart/${nick()}`}
                    class="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg
                           bg-accent-muted text-accent text-xs font-medium
                           hover:bg-accent hover:text-accent-fg transition-all"
                  >
                    <MdFillShopping_cart size={14} />
                    {t("cart.view_cart")}
                  </A>
                </Show>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </Show>
  );
}
