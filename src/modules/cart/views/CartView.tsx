import { createEffect, createSignal, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  MdFillShopping_cart,
  MdOutlineAdd_shopping_cart,
  MdFillRemove_shopping_cart,
} from 'solid-icons/md';
import {
  catalog, loading, error, cartItems, cartCount, cartSubtotal, nick,
  loadCatalog, addItem, removeItem,
} from '../store/store';

type Tab = 'catalog' | 'cart';

export default function CartView() {
  const params = useParams<{ nick?: string }>();
  const [tab, setTab] = createSignal<Tab>('catalog');

  createEffect(() => {
    const n = params.nick ?? '';
    if (n) loadCatalog(n);
  });

  return (
    <div class="max-w-3xl mx-auto">
      {/* Tab bar */}
      <div class="flex gap-1 mb-5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
        <TabBtn active={tab() === 'catalog'} onClick={() => setTab('catalog')}>
          Catalog
        </TabBtn>
        <TabBtn active={tab() === 'cart'} onClick={() => setTab('cart')}>
          <span class="flex items-center gap-1.5">
            Cart
            <Show when={cartCount() > 0}>
              <span class="bg-blue-500 text-white text-[10px] font-bold rounded-full min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">
                {cartCount()}
              </span>
            </Show>
          </span>
        </TabBtn>
      </div>

      <Show when={loading()}>
        <CatalogSkeleton />
      </Show>

      <Show when={!loading() && error()}>
        <p class="text-sm text-red-500 dark:text-red-400 py-6 text-center">{error()}</p>
      </Show>

      <Show when={!loading() && !error() && tab() === 'catalog'}>
        <CatalogGrid />
      </Show>

      <Show when={!loading() && !error() && tab() === 'cart'}>
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
          ? 'bg-white dark:bg-zinc-700 shadow text-zinc-900 dark:text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
    >
      {props.children}
    </button>
  );
}

// ── Catalog grid ──────────────────────────────────────────────────────────────

function CatalogGrid() {
  return (
    <>
      <Show when={catalog().length === 0}>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
          No items in catalog.
        </p>
      </Show>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <For each={catalog()}>
          {(item) => (
            <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
                        rounded-2xl p-4 flex flex-col gap-3">
              <Show when={item.photoUrl}>
                <img src={item.photoUrl!} alt={item.desc}
                  class="w-full h-32 object-cover rounded-xl bg-zinc-100 dark:bg-zinc-800" />
              </Show>
              <Show when={!item.photoUrl}>
                <div class="w-full h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl
                            flex items-center justify-center">
                  <MdFillShopping_cart size={32} class="text-zinc-300 dark:text-zinc-600" />
                </div>
              </Show>

              <div class="flex-1">
                <p class="font-medium text-zinc-900 dark:text-zinc-100 text-sm leading-snug">
                  {item.desc}
                </p>
                <p class="text-blue-600 dark:text-blue-400 font-semibold text-sm mt-1">
                  {item.price}
                </p>
              </div>

              <Show when={item.orderQty === 0}>
                <button
                  onClick={() => addItem(item.sku)}
                  class="flex items-center justify-center gap-2 w-full py-2 rounded-xl
                         bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                >
                  <MdOutlineAdd_shopping_cart size={16} /> Add to Cart
                </button>
              </Show>

              <Show when={item.orderQty > 0}>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-green-600 dark:text-green-400 font-medium">
                    In cart: {item.orderQty}
                  </span>
                  <button
                    onClick={() => removeItem(item.sku)}
                    class="flex items-center gap-1 text-red-400 hover:text-red-600
                           dark:hover:text-red-400 transition-colors"
                  >
                    <MdFillRemove_shopping_cart size={14} /> Remove
                  </button>
                </div>
                <button
                  onClick={() => addItem(item.sku)}
                  class="flex items-center justify-center gap-2 w-full py-2 rounded-xl
                         border border-blue-500 text-blue-600 dark:text-blue-400
                         hover:bg-blue-50 dark:hover:bg-blue-950/40
                         text-sm font-medium transition-colors"
                >
                  <MdOutlineAdd_shopping_cart size={16} /> Add More
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
  return (
    <div class="flex flex-col gap-4">
      <Show when={cartItems().length === 0}>
        <div class="text-center py-14">
          <MdFillShopping_cart size={48} class="text-zinc-200 dark:text-zinc-700 mx-auto mb-3" />
          <p class="text-zinc-500 dark:text-zinc-400 text-sm mb-3">Your cart is empty.</p>
          <button
            onClick={props.onBrowse}
            class="text-blue-500 hover:text-blue-600 text-sm font-medium hover:underline"
          >
            Browse catalog
          </button>
        </div>
      </Show>

      <Show when={cartItems().length > 0}>
        {/* Item list */}
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
          <For each={cartItems()}>
            {(item) => (
              <div class="flex items-center gap-3 p-4">
                <Show when={item.photoUrl}>
                  <img src={item.photoUrl!} alt={item.desc}
                    class="w-11 h-11 object-cover rounded-xl shrink-0" />
                </Show>
                <Show when={!item.photoUrl}>
                  <div class="w-11 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl shrink-0
                              flex items-center justify-center">
                    <MdFillShopping_cart size={18} class="text-zinc-400" />
                  </div>
                </Show>

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {item.desc}
                  </p>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {item.price} × {item.orderQty}
                  </p>
                </div>

                <button
                  onClick={() => removeItem(item.sku)}
                  title="Remove from cart"
                  class="shrink-0 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <MdFillRemove_shopping_cart size={20} />
                </button>
              </div>
            )}
          </For>
        </div>

        {/* Totals */}
        <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
          <div class="flex justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            <span>Estimated Total</span>
            <span>{cartSubtotal()}</span>
          </div>
          <p class="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            Taxes and final total calculated at checkout.
          </p>
        </div>

        {/* Checkout */}
        <a
          href={`/cart/${nick()}/checkout/start`}
          class="block w-full py-3 rounded-2xl bg-blue-500 hover:bg-blue-600
                 text-white text-center font-medium text-sm transition-colors"
        >
          Proceed to Checkout
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
          <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
                      rounded-2xl p-4 animate-pulse">
            <div class="w-full h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl mb-3" />
            <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4 mb-2" />
            <div class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-3" />
            <div class="h-9 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          </div>
        )}
      </For>
    </div>
  );
}
