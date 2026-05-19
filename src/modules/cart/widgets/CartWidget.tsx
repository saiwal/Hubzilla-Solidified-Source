import { Show, For } from 'solid-js';
import { A } from '@solidjs/router';
import { MdFillShopping_cart } from 'solid-icons/md';
import { cartCount, cartItems, nick } from '../store';

export default function CartWidget() {
  return (
    <Show when={cartCount() > 0}>
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800
                  rounded-2xl p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <MdFillShopping_cart size={18} class="text-blue-500" />
            <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cart</span>
          </div>
          <span class="text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400
                       rounded-full px-2 py-0.5">
            {cartCount()} item{cartCount() === 1 ? '' : 's'}
          </span>
        </div>

        <div class="flex flex-col gap-1">
          <Show
            when={cartItems().length > 0}
            fallback={
              <p class="text-xs text-zinc-400 dark:text-zinc-500">No items yet.</p>
            }
          >
            <For each={cartItems().slice(0, 3)}>
              {(item) => (
                <div class="flex items-center justify-between text-xs gap-2">
                  <span class="truncate text-zinc-700 dark:text-zinc-300">{item.desc}</span>
                  <span class="shrink-0 text-zinc-400 dark:text-zinc-500">×{item.orderQty}</span>
                </div>
              )}
            </For>
            <Show when={cartItems().length > 3}>
              <p class="text-xs text-zinc-400 dark:text-zinc-500">
                +{cartItems().length - 3} more
              </p>
            </Show>
          </Show>
        </div>

        <A
          href={`/cart/${nick()}`}
          class="text-center text-xs font-medium text-blue-600 dark:text-blue-400
                 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          View cart →
        </A>
      </div>
    </Show>
  );
}
