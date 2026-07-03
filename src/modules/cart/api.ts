import { apiFetch } from '@/shared/lib/fetch';

export interface CatalogItem {
  sku: string;
  desc: string;
  price_raw: number;
  price: string;
  photo_url: string | null;
  type: string;
  active?: boolean;
}

export interface CatalogItemInput {
  sku?: string;
  description: string;
  price: number;
  photo_url?: string;
  active?: boolean;
}

export interface OrderItem {
  id: number;
  sku: string;
  desc: string;
  qty: number;
  price_raw: number;
  price: string;
  // seller-only
  fulfilled?: boolean;
  confirmed?: boolean;
  exception?: boolean;
  notes?: string[];
}

export interface Order {
  hash: string | null;
  items: OrderItem[];
  subtotal_raw: number;
  subtotal: string;
  currency: string;
  checked_out: boolean;
  paid: boolean;
}

export interface SellerOrder extends Order {
  buyer: string;
  buyer_name: string;
  payment: { provider: string; txn_id: string } | null;
  flags: { confirmed: boolean; fulfilled: boolean; exception: boolean };
  notes: string[];
}

export interface PaymentProvider {
  id: string;
  label: string;
  enabled: boolean;
  // PayPal
  client_id?: string;
  // Razorpay
  key_id?: string;
  currency?: string;
  // Cashfree
  app_id?: string;
  mode?: 'sandbox' | 'production';
  // UPI
  upi_id?: string;
  display_name?: string;
}

export interface PaymentConfig {
  providers: PaymentProvider[];
  currency: string;
}

export interface PaymentSettings {
  currency: string;
  paypal: {
    enabled: boolean;
    client_id: string;
    secret: string;
    mode: 'sandbox' | 'live';
  };
  razorpay: {
    enabled: boolean;
    key_id: string;
    key_secret: string;
    currency: string;
  };
  cashfree: {
    enabled: boolean;
    app_id: string;
    secret_key: string;
    mode: 'sandbox' | 'production';
  };
  upi: {
    enabled: boolean;
    upi_id: string;
    display_name: string;
  };
  manual: {
    enabled: boolean;
    instructions: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function cartGet<T>(path: string): Promise<T> {
  const res = await apiFetch(`/api/cart/${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Cart error ${res.status}`);
  }
  return (await res.json()).data as T;
}

async function cartPost<T>(path: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await apiFetch(`/api/cart/${path}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `Cart error ${res.status}`);
  }
  return (await res.json()).data as T;
}

// ── Catalog ───────────────────────────────────────────────────────────────────

export const fetchCatalog = (nick: string) =>
  cartGet<CatalogItem[]>(`${nick}/catalog`);

export const fetchCatalogAll = (nick: string) =>
  cartGet<CatalogItem[]>(`${nick}/catalog?all=1`);

export const saveCatalogItem = (nick: string, item: CatalogItemInput) =>
  cartPost<CatalogItem[]>(`${nick}/catalog`, item as unknown as Record<string, unknown>);

export const deleteCatalogItem = (nick: string, sku: string) =>
  cartPost<CatalogItem[]>(`${nick}/catalog/delete`, { sku });

export const toggleCatalogItem = (nick: string, sku: string) =>
  cartPost<CatalogItem[]>(`${nick}/catalog/toggle`, { sku });

// ── Order ─────────────────────────────────────────────────────────────────────

export const fetchOrder = (nick: string) =>
  cartGet<Order>(`${nick}/order`);

export const addItem = (nick: string, sku: string, qty = 1) =>
  cartPost<Order>(`${nick}/item`, { sku, qty });

export const removeItem = (nick: string, sku: string) =>
  cartPost<Order>(`${nick}/item/remove`, { sku });

export const setItemQty = (nick: string, sku: string, qty: number) =>
  cartPost<Order>(`${nick}/item/qty`, { sku, qty });

export const checkout = (nick: string, paymentHint = '') =>
  cartPost<{ checked_out: boolean; order_hash: string }>(`${nick}/checkout`, { payment_hint: paymentHint });

// ── Payment ───────────────────────────────────────────────────────────────────

export const fetchPaymentConfig = (nick: string) =>
  cartGet<PaymentConfig>(`${nick}/payment-config`);

export const fetchPaymentSettings = (nick: string) =>
  cartGet<PaymentSettings>(`${nick}/payment-settings`);

export const savePaymentSettings = (nick: string, settings: Partial<PaymentSettings>) =>
  cartPost<PaymentSettings>(`${nick}/payment-settings`, settings as Record<string, unknown>);

export const paypalCreateOrder = (nick: string, orderHash: string) =>
  cartPost<{ paypal_order_id: string }>(`${nick}/paypal/create-order`, { order_hash: orderHash });

export const paypalCapture = (nick: string, paypalOrderId: string, orderHash: string) =>
  cartPost<{ paid: boolean; order_hash: string; txn_id: string }>(
    `${nick}/paypal/capture`,
    { paypal_order_id: paypalOrderId, order_hash: orderHash }
  );

export const razorpayCreateOrder = (nick: string, orderHash: string) =>
  cartPost<{ razorpay_order_id: string; key_id: string; amount: number; currency: string }>(
    `${nick}/razorpay/create-order`, { order_hash: orderHash }
  );

export const cashfreeCreateOrder = (nick: string, orderHash: string, customerPhone: string) =>
  cartPost<{ payment_session_id: string; mode: string }>(
    `${nick}/cashfree/create-order`, { order_hash: orderHash, customer_phone: customerPhone }
  );

export const cashfreeVerify = (nick: string, orderHash: string) =>
  cartPost<{ paid: boolean; order_hash: string; txn_id: string }>(
    `${nick}/cashfree/verify`, { order_hash: orderHash }
  );

export const razorpayVerify = (
  nick: string,
  rzpOrderId: string,
  rzpPaymentId: string,
  rzpSignature: string,
  orderHash: string,
) =>
  cartPost<{ paid: boolean; order_hash: string; txn_id: string }>(
    `${nick}/razorpay/verify`,
    { razorpay_order_id: rzpOrderId, razorpay_payment_id: rzpPaymentId,
      razorpay_signature: rzpSignature, order_hash: orderHash }
  );

// ── Seller orders ─────────────────────────────────────────────────────────────

export const fetchSellerOrders = (nick: string) =>
  cartGet<SellerOrder[]>(`${nick}/orders`);

export const fetchSellerOrder = (nick: string, hash: string) =>
  cartGet<SellerOrder>(`${nick}/orders/${hash}`);

export const markOrderPaid = (nick: string, hash: string) =>
  cartPost<SellerOrder>(`${nick}/orders/${hash}/markpaid`);

export const addOrderNote = (nick: string, hash: string, text: string) =>
  cartPost<SellerOrder>(`${nick}/orders/${hash}/note`, { text });

export const fulfillOrderItem = (nick: string, hash: string, itemId: number) =>
  cartPost<SellerOrder>(`${nick}/orders/${hash}/items/${itemId}/fulfill`);

export const cancelOrderItem = (nick: string, hash: string, itemId: number) =>
  cartPost<SellerOrder>(`${nick}/orders/${hash}/items/${itemId}/cancel`);
