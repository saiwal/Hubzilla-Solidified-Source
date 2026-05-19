import { createSignal, createMemo } from 'solid-js';
import type { CatalogItem } from './api';
import { fetchCatalog, addItem as apiAdd, removeItem as apiRemove } from './api';

// ── State ─────────────────────────────────────────────────────────────────────

const [catalog, setCatalog] = createSignal<CatalogItem[]>([]);
const [loading, setLoading]  = createSignal(false);
const [error, setError]      = createSignal<string | null>(null);
const [nick, setNick]        = createSignal('');

// ── Derived ───────────────────────────────────────────────────────────────────

export const cartItems = createMemo(() => catalog().filter(i => i.orderQty > 0));

export const cartCount = createMemo(() =>
  cartItems().reduce((n, i) => n + i.orderQty, 0)
);

export const cartSubtotal = createMemo(() => {
  const total = cartItems().reduce((sum, item) => {
    const price = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
    return sum + price * item.orderQty;
  }, 0);
  return total.toFixed(2);
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function loadCatalog(nickname: string) {
  setNick(nickname);
  setLoading(true);
  setError(null);
  try {
    const items = await fetchCatalog(nickname);
    setCatalog(items);
  } catch (err) {
    setError('Failed to load catalog. Make sure the cart addon is enabled for this channel.');
    console.error('[cart] loadCatalog failed', err);
  } finally {
    setLoading(false);
  }
}

export async function addItem(sku: string) {
  const n = nick();
  if (!n) return;
  // Optimistic update
  setCatalog(prev =>
    prev.map(item => item.sku === sku ? { ...item, orderQty: item.orderQty + 1 } : item)
  );
  try {
    await apiAdd(n, sku);
  } catch (err) {
    console.error('[cart] addItem failed', err);
    // Re-fetch to get accurate state on error
    await loadCatalog(n);
  }
}

export async function removeItem(sku: string) {
  const n = nick();
  if (!n) return;
  setCatalog(prev =>
    prev.map(item => item.sku === sku ? { ...item, orderQty: 0 } : item)
  );
  try {
    await apiRemove(n, sku);
  } catch (err) {
    console.error('[cart] removeItem failed', err);
    await loadCatalog(n);
  }
}

export { catalog, loading, error, nick };
