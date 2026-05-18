export interface CatalogItem {
  sku: string;
  desc: string;
  price: string;
  photoUrl: string | null;
  orderQty: number;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export async function fetchCatalog(nick: string): Promise<CatalogItem[]> {
  const res = await fetch(`/cart/${nick}/catalog`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Cart error: ${res.status}`);
  const html = await res.text();
  return parseCatalogHtml(html);
}

function parseCatalogHtml(html: string): CatalogItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const table = doc.querySelector('table');
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll('tr')).slice(1); // skip header row
  return rows.flatMap(row => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 4) return [];

    const addBtn = cells[0].querySelector('button[name="add"]') as HTMLButtonElement | null;
    const sku = addBtn?.value?.trim() ?? '';
    if (!sku) return [];

    const img = cells[1].querySelector('img') as HTMLImageElement | null;
    const photoUrl = img?.getAttribute('src') ?? null;
    const desc = cells[2].textContent?.trim() ?? '';
    const price = cells[3].textContent?.trim() ?? '';

    // cells[4]: "<i class='bi bi-cart'></i> 2" or empty
    const qtyRaw = cells[4]?.textContent?.trim() ?? '';
    const orderQty = parseInt(qtyRaw.replace(/\D/g, ''), 10) || 0;

    return [{ sku, desc, price, photoUrl, orderQty }];
  });
}

// ── Mutations (form-encoded, matching Hubzilla cart_post handler) ─────────────

async function cartPost(nick: string, params: Record<string, string>): Promise<void> {
  const form = new URLSearchParams(params);
  await fetch(`/cart/${nick}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
    redirect: 'follow',
  });
}

export function addItem(nick: string, sku: string, qty = 1): Promise<void> {
  return cartPost(nick, { cart_posthook: 'add_item', add: sku, qty: String(qty) });
}

export function removeItem(nick: string, sku: string): Promise<void> {
  return cartPost(nick, { cart_posthook: 'update_item', delsku: sku });
}

export function updateItemQty(nick: string, itemId: number, qty: number): Promise<void> {
  return cartPost(nick, { cart_posthook: 'update_item', [`qty-${itemId}`]: String(qty) });
}
