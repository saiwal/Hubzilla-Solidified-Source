import { Show, For } from 'solid-js';
import { A } from '@solidjs/router';
import { MdFillShopping_cart } from 'solid-icons/md';
import { cartCount, cartItems, nick } from '../store';
import { useI18n } from '@/i18n';

export default function CartWidget() {
  const { t } = useI18n();
  return (
    <Show when={cartCount() > 0}>
      <div class="bg-elevated border border-rim rounded-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <MdFillShopping_cart size={18} class="text-accent" />
            <span class="text-sm font-semibold text-txt">{t("cart.cart_label")}</span>
          </div>
          <span class="text-xs font-bold bg-accent-muted text-accent-txt rounded-full px-2 py-0.5">
            {cartCount()} {cartCount() === 1 ? t("cart.item_singular") : t("cart.item_plural")}
          </span>
        </div>

        <div class="flex flex-col gap-1">
          <Show
            when={cartItems().length > 0}
            fallback={
              <p class="text-xs text-muted">{t("cart.no_items_yet")}</p>
            }
          >
            <For each={cartItems().slice(0, 3)}>
              {(item) => (
                <div class="flex items-center justify-between text-xs gap-2">
                  <span class="truncate text-muted">{item.desc}</span>
                  <span class="shrink-0 text-muted">×{item.orderQty}</span>
                </div>
              )}
            </For>
            <Show when={cartItems().length > 3}>
              <p class="text-xs text-muted">
                +{cartItems().length - 3} more
              </p>
            </Show>
          </Show>
        </div>

        <A
          href={`/cart/${nick()}`}
          class="text-center text-xs font-medium text-accent hover:text-accent-txt transition-colors"
        >
          {t("cart.view_cart")}
        </A>
      </div>
    </Show>
  );
}
