import { createEffect, createSignal, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  MdFillShopping_cart,
  MdOutlineAdd_shopping_cart,
  MdFillRemove_shopping_cart,
} from 'solid-icons/md';
import {
  catalog, loading, cartItems, cartCount, cartSubtotal, nick,
  loadCatalog, addItem, removeItem,
} from '../store';
import { useI18n } from '@/i18n';

type Tab = 'catalog' | 'cart';

export default function CartView() {
  const { t } = useI18n();
  const params = useParams<{ nick?: string }>();
  const [tab, setTab] = createSignal<Tab>('catalog');

  createEffect(() => {
    const n = params.nick ?? '';
    if (n) loadCatalog(n);
  });

  return (
    <div class="max-w-3xl mx-auto">
      {/* Tab bar */}
      <div class="flex gap-1 mb-5 p-1 bg-surface border border-rim rounded-xl w-fit">
        <TabBtn active={tab() === 'catalog'} onClick={() => setTab('catalog')}>
          {t("cart.catalog_tab")}
        </TabBtn>
        <TabBtn active={tab() === 'cart'} onClick={() => setTab('cart')}>
          <span class="flex items-center gap-1.5">
            {t("cart.cart_tab")}
            <Show when={cartCount() > 0}>
              <span class="bg-accent text-accent-fg text-[10px] font-bold rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">
                {cartCount()}
              </span>
            </Show>
          </span>
        </TabBtn>
      </div>

      <Show when={loading()}>
        <CatalogSkeleton />
      </Show>

      <Show when={!loading() && tab() === 'catalog'}>
        <CatalogGrid />
      </Show>

      <Show when={!loading() && tab() === 'cart'}>
        <CartContents onBrowse={() => setTab('catalog')} />
      </Show>
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn(props: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      onClick={props.onClick}
      class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
        ${props.active
          ? 'bg-elevated shadow text-txt'
          : 'text-muted hover:text-txt'}`}
    >
      {props.children}
    </button>
  );
}

// ── Catalog grid ──────────────────────────────────────────────────────────────

function CatalogGrid() {
  const { t } = useI18n();
  return (
    <>
      <Show when={catalog().length === 0}>
        <p class="text-sm text-muted py-8 text-center">
          {t("cart.no_items")}
        </p>
      </Show>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <For each={catalog()}>
          {(item) => (
            <div class="bg-elevated border border-rim rounded-2xl p-4 flex flex-col gap-3">
              <Show when={item.photoUrl}>
                <img src={item.photoUrl!} alt={item.desc}
                  class="w-full h-32 object-cover rounded-xl bg-surface" />
              </Show>
              <Show when={!item.photoUrl}>
                <div class="w-full h-32 bg-surface rounded-xl flex items-center justify-center">
                  <MdFillShopping_cart size={32} class="text-subtle" />
                </div>
              </Show>

              <div class="flex-1">
                <p class="font-medium text-txt text-sm leading-snug">
                  {item.desc}
                </p>
                <p class="text-accent font-semibold text-sm mt-1">
                  {item.price}
                </p>
              </div>

              <Show when={item.orderQty === 0}>
                <button
                  onClick={() => addItem(item.sku)}
                  class="flex items-center justify-center gap-2 w-full py-2 rounded-xl
                         bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <MdOutlineAdd_shopping_cart size={16} /> {t("cart.add_to_cart")}
                </button>
              </Show>

              <Show when={item.orderQty > 0}>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-green-600 dark:text-green-400 font-medium">
                    {t("cart.in_cart")} {item.orderQty}
                  </span>
                  <button
                    onClick={() => removeItem(item.sku)}
                    class="flex items-center gap-1 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <MdFillRemove_shopping_cart size={14} /> {t("cart.remove")}
                  </button>
                </div>
                <button
                  onClick={() => addItem(item.sku)}
                  class="flex items-center justify-center gap-2 w-full py-2 rounded-xl
                         border border-accent text-accent
                         hover:bg-accent-muted
                         text-sm font-medium transition-colors"
                >
                  <MdOutlineAdd_shopping_cart size={16} /> {t("cart.add_more")}
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
    </>
  );
}

// ── Cart contents ─────────────────────────────────────────────────────────────

function CartContents(props: { onBrowse: () => void }) {
  const { t } = useI18n();
  return (
    <div class="flex flex-col gap-4">
      <Show when={cartItems().length === 0}>
        <div class="text-center py-14">
          <MdFillShopping_cart size={48} class="text-subtle mx-auto mb-3" />
          <p class="text-muted text-sm mb-3">{t("cart.cart_empty")}</p>
          <button
            onClick={props.onBrowse}
            class="text-accent hover:text-accent-txt text-sm font-medium hover:underline"
          >
            {t("cart.browse_catalog")}
          </button>
        </div>
      </Show>

      <Show when={cartItems().length > 0}>
        {/* Item list */}
        <div class="bg-elevated border border-rim rounded-2xl divide-y divide-rim overflow-hidden">
          <For each={cartItems()}>
            {(item) => (
              <div class="flex items-center gap-3 p-4">
                <Show when={item.photoUrl}>
                  <img src={item.photoUrl!} alt={item.desc}
                    class="w-11 h-11 object-cover rounded-xl shrink-0" />
                </Show>
                <Show when={!item.photoUrl}>
                  <div class="w-11 h-11 bg-surface rounded-xl shrink-0
                              flex items-center justify-center">
                    <MdFillShopping_cart size={18} class="text-subtle" />
                  </div>
                </Show>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-txt truncate">
                    {item.desc}
                  </p>
                  <p class="text-xs text-muted mt-0.5">
                    {item.price} × {item.orderQty}
                  </p>
                </div>

                <button
                  onClick={() => removeItem(item.sku)}
                  title="Remove from cart"
                  class="shrink-0 text-subtle hover:text-red-500 transition-colors"
                >
                  <MdFillRemove_shopping_cart size={20} />
                </button>
              </div>
            )}
          </For>
        </div>

        {/* Totals */}
        <div class="bg-elevated border border-rim rounded-2xl p-4">
          <div class="flex justify-between text-sm font-semibold text-txt">
            <span>{t("cart.estimated_total")}</span>
            <span>{cartSubtotal()}</span>
          </div>
          <p class="text-xs text-muted mt-1">
            {t("cart.checkout_note")}
          </p>
        </div>

        {/* Checkout */}
        <a
          href={`/cart/${nick()}/checkout/start`}
          class="block w-full py-3 rounded-2xl bg-accent hover:opacity-90
                 text-accent-fg text-center font-medium text-sm transition-opacity"
        >
          {t("cart.checkout")}
        </a>
      </Show>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CatalogSkeleton() {
  return (
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <For each={Array(6).fill(0)}>
        {() => (
          <div class="bg-elevated border border-rim rounded-2xl p-4 animate-pulse">
            <div class="w-full h-32 bg-surface rounded-xl mb-3" />
            <div class="h-4 bg-surface rounded w-3/4 mb-2" />
            <div class="h-4 bg-surface rounded w-1/3 mb-3" />
            <div class="h-9 bg-surface rounded-xl" />
          </div>
        )}
      </For>
    </div>
  );
}
