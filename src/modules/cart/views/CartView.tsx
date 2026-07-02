import { createEffect, createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import { useParams } from '@solidjs/router';
import {
  MdFillShopping_cart,
  MdOutlineAdd_shopping_cart,
  MdFillRemove_shopping_cart,
  MdFillAdd,
  MdFillRemove,
  MdFillStore,
  MdFillReceipt_long,
  MdFillError,
  MdFillSettings,
  MdFillCheck_circle,
} from 'solid-icons/md';
import {
  catalogWithQty, loading, cartItems, cartCount, cartSubtotal, isCheckedOut,
  paymentConfig, paymentSettings, paymentSettingsLoading, order,
  loadCatalog, addItem, removeItem, setItemQty, checkout,
  paypalCreateOrder, paypalCapture,
  razorpayCreateOrder, razorpayVerify,
  cashfreeCreateOrder, cashfreeVerify,
  loadPaymentSettings, savePaymentSettings,
  sellerOrders, ordersLoading, selectedOrder, orderDetailLoading,
  loadSellerOrders, loadSellerOrder, markOrderPaid, addOrderNote,
  fulfillItem, cancelItem, setSelectedOrder,
} from '../store';
import type { PaymentSettings } from '../api';
import { useI18n } from '@/i18n';
import { useViewerRole } from '@/shared/store/site-config';

type Tab = 'catalog' | 'cart' | 'orders';

export default function CartView() {
  const { t } = useI18n();
  const params = useParams<{ nick?: string }>();
  const viewerRole = useViewerRole();
  const isOwner = () => viewerRole() === 'owner';
  const [tab, setTab] = createSignal<Tab>('catalog');

  createEffect(() => {
    const n = params.nick ?? '';
    if (n) loadCatalog(n);
  });

  const switchTab = (next: Tab) => {
    if (next === 'orders') loadSellerOrders();
    setTab(next);
    setSelectedOrder(null);
  };

  return (
    <div class="max-w-3xl mx-auto">
      <div class="flex gap-1 mb-5 p-1 bg-surface border border-rim rounded-xl w-fit">
        <TabBtn active={tab() === 'catalog'} onClick={() => switchTab('catalog')}>
          {t('cart.catalog_tab')}
        </TabBtn>
        <TabBtn active={tab() === 'cart'} onClick={() => switchTab('cart')}>
          <span class="flex items-center gap-1.5">
            {t('cart.cart_tab')}
            <Show when={cartCount() > 0}>
              <span class="bg-accent text-accent-fg text-[10px] font-bold rounded-full
                           min-w-[1.1rem] h-[1.1rem] flex items-center justify-center px-1">
                {cartCount()}
              </span>
            </Show>
          </span>
        </TabBtn>
        <Show when={isOwner()}>
          <TabBtn active={tab() === 'orders'} onClick={() => switchTab('orders')}>
            <span class="flex items-center gap-1.5">
              <MdFillStore size={14} />
              {t('cart.orders_tab')}
            </span>
          </TabBtn>
        </Show>
      </div>

      <Show when={loading()}>
        <CatalogSkeleton />
      </Show>
      <Show when={!loading() && tab() === 'catalog'}>
        <CatalogGrid />
      </Show>
      <Show when={!loading() && tab() === 'cart'}>
        <CartContents onBrowse={() => switchTab('catalog')} />
      </Show>
      <Show when={tab() === 'orders'}>
        <Show when={selectedOrder() !== null}>
          <OrderDetail />
        </Show>
        <Show when={selectedOrder() === null}>
          <MyShop />
        </Show>
      </Show>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────

function TabBtn(props: { active: boolean; onClick: () => void; children: any }) {
  return (
    <button
      onClick={props.onClick}
      class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
        ${props.active ? 'bg-elevated shadow text-txt' : 'text-muted hover:text-txt'}`}
    >
      {props.children}
    </button>
  );
}

// ── Catalog grid ──────────────────────────────────────────────────────────────

function CatalogGrid() {
  const { t } = useI18n();
  const viewerRole = useViewerRole();
  return (
    <>
      <Show when={catalogWithQty().length === 0}>
        <p class="text-sm text-muted py-8 text-center">{t('cart.no_items')}</p>
      </Show>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <For each={catalogWithQty()}>
          {(item) => (
            <div class="bg-elevated border border-rim rounded-2xl p-4 flex flex-col gap-3">
              <Show when={item.photo_url}
                fallback={
                  <div class="w-full h-32 bg-surface rounded-xl flex items-center justify-center">
                    <MdFillShopping_cart size={32} class="text-subtle" />
                  </div>
                }
              >
                <img src={item.photo_url!} alt={item.desc}
                  class="w-full h-32 object-cover rounded-xl bg-surface" />
              </Show>
              <div class="flex-1">
                <p class="font-medium text-txt text-sm leading-snug">{item.desc}</p>
                <p class="text-accent font-semibold text-sm mt-1">{item.price}</p>
              </div>
              <Show when={item.in_order === 0}
                fallback={<QtyStepper sku={item.sku} qty={item.in_order} />}
              >
                <button
                  onClick={() => viewerRole() === 'anonymous'
                    ? (window.location.href = '/login')
                    : addItem(item.sku)}
                  class="flex items-center justify-center gap-2 w-full py-2 rounded-xl
                         bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <MdOutlineAdd_shopping_cart size={16} /> {t('cart.add_to_cart')}
                </button>
              </Show>
            </div>
          )}
        </For>
      </div>
    </>
  );
}

// ── Qty stepper ───────────────────────────────────────────────────────────────

function QtyStepper(props: { sku: string; qty: number }) {
  return (
    <div class="flex items-center justify-between gap-2">
      <button
        onClick={() => setItemQty(props.sku, props.qty - 1)}
        class="w-8 h-8 rounded-lg bg-surface flex items-center justify-center
               text-txt hover:bg-rim transition-colors"
        aria-label="Decrease"
      >
        <MdFillRemove size={14} />
      </button>
      <span class="text-sm font-semibold text-txt min-w-[1.5rem] text-center">{props.qty}</span>
      <button
        onClick={() => setItemQty(props.sku, props.qty + 1)}
        class="w-8 h-8 rounded-lg bg-surface flex items-center justify-center
               text-txt hover:bg-rim transition-colors"
        aria-label="Increase"
      >
        <MdFillAdd size={14} />
      </button>
    </div>
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
          <p class="text-muted text-sm mb-3">{t('cart.cart_empty')}</p>
          <button
            onClick={props.onBrowse}
            class="text-accent hover:text-accent-txt text-sm font-medium hover:underline"
          >
            {t('cart.browse_catalog')}
          </button>
        </div>
      </Show>

      <Show when={cartItems().length > 0}>
        <div class="bg-elevated border border-rim rounded-2xl divide-y divide-rim overflow-hidden">
          <For each={cartItems()}>
            {(item) => {
              const catItem = () => catalogWithQty().find(c => c.sku === item.sku);
              return (
                <div class="flex items-center gap-3 p-4">
                  <Show when={catItem()?.photo_url}
                    fallback={
                      <div class="w-11 h-11 bg-surface rounded-xl shrink-0 flex items-center justify-center">
                        <MdFillShopping_cart size={18} class="text-subtle" />
                      </div>
                    }
                  >
                    <img src={catItem()!.photo_url!} alt={item.desc}
                      class="w-11 h-11 object-cover rounded-xl shrink-0" />
                  </Show>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-txt truncate">{item.desc}</p>
                    <p class="text-xs text-muted mt-0.5">{item.price}</p>
                  </div>
                  <QtyStepper sku={item.sku} qty={item.qty} />
                  <button
                    onClick={() => removeItem(item.sku)}
                    title={t('cart.remove')}
                    class="shrink-0 text-subtle hover:text-red-500 transition-colors ml-1"
                  >
                    <MdFillRemove_shopping_cart size={20} />
                  </button>
                </div>
              );
            }}
          </For>
        </div>

        <div class="bg-elevated border border-rim rounded-2xl p-4">
          <div class="flex justify-between text-sm font-semibold text-txt">
            <span>{t('cart.estimated_total')}</span>
            <span>{cartSubtotal()}</span>
          </div>
          <p class="text-xs text-muted mt-1">{t('cart.checkout_note')}</p>
        </div>

        <Show
          when={!isCheckedOut()}
          fallback={<OrderPlacedBanner paid={order()?.paid ?? false} />}
        >
          <PaymentOptions />
        </Show>
      </Show>
    </div>
  );
}

// ── Order placed banner ───────────────────────────────────────────────────────

function OrderPlacedBanner(props: { paid: boolean }) {
  const { t } = useI18n();
  return (
    <div class="rounded-2xl border p-5 text-center flex flex-col items-center gap-2
                bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
      <MdFillCheck_circle size={32} class="text-green-500" />
      <p class="text-sm font-semibold text-green-800 dark:text-green-300">
        {props.paid ? t('cart.payment_success') : t('cart.order_placed')}
      </p>
      <Show when={!props.paid}>
        <p class="text-xs text-green-700 dark:text-green-400">{t('cart.order_placed_note')}</p>
      </Show>
    </div>
  );
}

// ── Payment options ───────────────────────────────────────────────────────────

function PaymentOptions() {
  const { t } = useI18n();
  const providers = () => paymentConfig()?.providers ?? [];
  const has = (id: string) => providers().some(p => p.id === id && p.enabled);

  const hasAnyGateway = () => has('paypal') || has('razorpay') || has('cashfree') || has('upi');

  return (
    <div class="bg-elevated border border-rim rounded-2xl p-4 flex flex-col gap-4">
      <p class="text-xs font-semibold text-muted uppercase tracking-wide">
        {t('cart.payment_options')}
      </p>

      <Show when={has('paypal')}>
        <div class="flex flex-col gap-2">
          <p class="text-xs text-muted">{t('cart.pay_with_paypal')}</p>
          <PayPalButton />
        </div>
      </Show>

      <Show when={has('razorpay')}>
        <RazorpayButton provider={providers().find(p => p.id === 'razorpay')!} />
      </Show>

      <Show when={has('cashfree')}>
        <CashfreeButton provider={providers().find(p => p.id === 'cashfree')!} />
      </Show>

      <Show when={has('upi')}>
        <UpiPayment provider={providers().find(p => p.id === 'upi')!} />
      </Show>

      <Show when={hasAnyGateway()}>
        <div class="flex items-center gap-3 text-xs text-subtle">
          <span class="flex-1 h-px bg-rim" />
          <span>or</span>
          <span class="flex-1 h-px bg-rim" />
        </div>
      </Show>

      <button
        onClick={() => checkout()}
        class="w-full py-2.5 rounded-xl border border-rim text-sm font-medium text-muted
               hover:bg-surface hover:text-txt transition-colors"
      >
        {t('cart.contact_seller')}
      </button>
    </div>
  );
}

// ── PayPal button ─────────────────────────────────────────────────────────────

function PayPalButton() {
  let container!: HTMLDivElement;
  const { t } = useI18n();
  const [sdkError, setSdkError] = createSignal(false);

  onMount(() => {
    const config = paymentConfig();
    const ppProvider = config?.providers.find(p => p.id === 'paypal');
    if (!ppProvider?.client_id) return;

    const currency = config?.currency ?? 'USD';

    loadPayPalSdk(ppProvider.client_id, currency)
      .then(() => {
        const w = window as any;
        if (!w.paypal || !container) return;
        w.paypal.Buttons({
          createOrder: () => paypalCreateOrder(),
          onApprove: (data: { orderID: string }) => paypalCapture(data.orderID),
          onError: () => setSdkError(true),
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
        }).render(container);
      })
      .catch(() => setSdkError(true));
  });

  onCleanup(() => {
    // PayPal cleans up when container is removed from DOM
    if (container) container.innerHTML = '';
  });

  return (
    <Show when={!sdkError()} fallback={
      <p class="text-xs text-red-500 py-2 text-center">{t('cart.payment_failed')}</p>
    }>
      <div ref={container!} class="min-h-[50px]" />
    </Show>
  );
}

function loadPayPalSdk(clientId: string, currency: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('paypal-sdk-script');
    if (existing) {
      // Script tag exists — either loaded or loading
      if ((window as any).paypal) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id  = 'paypal-sdk-script';
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}`;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', reject);
    document.head.appendChild(script);
  });
}

// ── Razorpay button ───────────────────────────────────────────────────────────

function RazorpayButton(_props: { provider: import('../api').PaymentProvider }) {
  const { t } = useI18n();
  const [loading, setLoading] = createSignal(false);
  const [err, setErr]         = createSignal(false);

  const pay = async () => {
    setLoading(true);
    setErr(false);
    try {
      const rzpData = await razorpayCreateOrder();
      await loadRazorpaySdk();
      const w = window as any;
      if (!w.Razorpay) throw new Error('Razorpay SDK unavailable');

      await new Promise<void>((resolve, reject) => {
        const rzp = new w.Razorpay({
          key:          rzpData.key_id,
          amount:       rzpData.amount,
          currency:     rzpData.currency,
          order_id:     rzpData.razorpay_order_id,
          name:         'Store',
          description:  'Order payment',
          handler: async (res: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              await razorpayVerify(res.razorpay_order_id, res.razorpay_payment_id, res.razorpay_signature);
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => reject(new Error('dismissed')) },
          theme: { color: '#6366f1' },
        });
        rzp.open();
      });
    } catch (e: any) {
      if (e?.message !== 'dismissed') setErr(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex flex-col gap-1">
      <button
        onClick={pay}
        disabled={loading()}
        class="w-full py-2.5 rounded-xl bg-[#072654] text-white text-sm font-medium
               hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
      >
        <Show when={loading()} fallback={<>
          <img src="https://razorpay.com/favicon.ico" alt="" class="w-4 h-4" />
          {t('cart.pay_with_razorpay')}
        </>}>
          {t('cart.payment_processing')}
        </Show>
      </button>
      <Show when={err()}>
        <p class="text-xs text-red-500 text-center">{t('cart.payment_failed')}</p>
      </Show>
    </div>
  );
}

function loadRazorpaySdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('razorpay-sdk-script');
    if (existing) {
      if ((window as any).Razorpay) { resolve(); return; }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id  = 'razorpay-sdk-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', reject);
    document.head.appendChild(script);
  });
}

// ── Cashfree button ───────────────────────────────────────────────────────────

function CashfreeButton(_props: { provider: import('../api').PaymentProvider }) {
  const { t } = useI18n();
  const [phone, setPhone]     = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [err, setErr]         = createSignal<string | null>(null);

  const pay = async () => {
    const p = phone().replace(/\D/g, '');
    if (p.length < 10) { setErr(t('cart.cashfree_phone_required')); return; }
    setLoading(true);
    setErr(null);
    try {
      const { payment_session_id, mode } = await cashfreeCreateOrder(p);
      await loadCashfreeSdk();
      const cf = (window as any).Cashfree({ mode });
      const result = await cf.checkout({
        paymentSessionId: payment_session_id,
        redirectTarget: '_modal',
      });
      if (result.error) {
        setErr(result.error.message ?? t('cart.payment_failed'));
      } else {
        await cashfreeVerify();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('cart.payment_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="flex flex-col gap-2">
      <input
        type="tel"
        placeholder={t('cart.cashfree_phone_placeholder')}
        value={phone()}
        onInput={e => setPhone(e.currentTarget.value)}
        class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
               placeholder-subtle focus:outline-none focus:border-accent"
      />
      <Show when={err()}>
        <p class="text-xs text-red-500">{err()}</p>
      </Show>
      <button
        onClick={pay}
        disabled={loading()}
        class="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50
               text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
      >
        {loading() ? t('cart.payment_processing') : t('cart.pay_with_cashfree')}
      </button>
    </div>
  );
}

function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Cashfree) { resolve(); return; }
    if (document.getElementById('cashfree-sdk-script')) {
      const existing = document.getElementById('cashfree-sdk-script')!;
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id  = 'cashfree-sdk-script';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', reject);
    document.head.appendChild(script);
  });
}

// ── UPI payment ───────────────────────────────────────────────────────────────

function UpiPayment(props: { provider: import('../api').PaymentProvider }) {
  const { t } = useI18n();
  const subtotal = cartSubtotal;
  const currency = () => paymentConfig()?.currency ?? 'INR';
  const orderHash = () => order()?.hash ?? '';

  const upiUri = () => {
    const pa = encodeURIComponent(props.provider.upi_id ?? '');
    const pn = encodeURIComponent(props.provider.display_name ?? 'Seller');
    const am = encodeURIComponent(subtotal().replace(',', ''));
    const tn = encodeURIComponent('Order ' + orderHash().slice(0, 8));
    return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&cu=${currency()}&tn=${tn}`;
  };

  const copyUpiId = () => {
    navigator.clipboard?.writeText(props.provider.upi_id ?? '').catch(() => {});
  };

  return (
    <div class="flex flex-col gap-3 p-3 rounded-xl border border-rim bg-surface">
      <div class="flex items-center justify-between">
        <p class="text-sm font-medium text-txt">{t('cart.pay_via_upi')}</p>
        <span class="text-xs text-muted">{subtotal()} {currency()}</span>
      </div>

      <div class="flex items-center gap-2 px-3 py-2 bg-elevated rounded-lg">
        <span class="text-xs font-mono text-txt flex-1">{props.provider.upi_id}</span>
        <button onClick={copyUpiId} class="text-xs text-accent hover:underline shrink-0">
          {t('cart.copy')}
        </button>
      </div>

      {/* App deep links */}
      <div class="flex gap-2">
        <a href={upiUri()} class="flex-1 py-2 rounded-lg text-center text-xs font-medium
                                  bg-[#4CAF50] text-white hover:opacity-90 transition-opacity">
          GPay
        </a>
        <a href={`phonepe://${upiUri().slice(6)}`}
           class="flex-1 py-2 rounded-lg text-center text-xs font-medium
                  bg-[#5f259f] text-white hover:opacity-90 transition-opacity">
          PhonePe
        </a>
        <a href={`paytmmp://${upiUri().slice(6)}`}
           class="flex-1 py-2 rounded-lg text-center text-xs font-medium
                  bg-[#00B9F1] text-white hover:opacity-90 transition-opacity">
          Paytm
        </a>
        <a href={upiUri()} class="flex-1 py-2 rounded-lg text-center text-xs font-medium
                                  bg-elevated border border-rim text-muted hover:text-txt transition-colors">
          {t('cart.upi_any_app')}
        </a>
      </div>

      <p class="text-xs text-subtle text-center">{t('cart.upi_confirm_note')}</p>

      <button
        onClick={() => checkout(`Buyer claimed UPI payment to ${props.provider.upi_id}`)}
        class="w-full py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white
               text-sm font-medium transition-colors"
      >
        {t('cart.i_have_paid')}
      </button>
    </div>
  );
}

// ── My Shop (orders + settings toggle) ───────────────────────────────────────

function MyShop() {
  const { t } = useI18n();
  const [showSettings, setShowSettings] = createSignal(false);

  const toggleSettings = () => {
    if (!showSettings() && !paymentSettings()) loadPaymentSettings();
    setShowSettings(s => !s);
  };

  return (
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-muted uppercase tracking-wide">
          {t('cart.orders_tab')}
        </span>
        <button
          onClick={toggleSettings}
          title={t('cart.payment_settings')}
          class={`p-1.5 rounded-lg transition-colors ${showSettings()
            ? 'bg-accent text-accent-fg'
            : 'text-muted hover:text-txt hover:bg-surface'}`}
        >
          <MdFillSettings size={16} />
        </button>
      </div>

      <Show when={showSettings()}>
        <PaymentSettingsPanel onClose={() => setShowSettings(false)} />
      </Show>

      <Show when={!showSettings()}>
        <OrdersList />
      </Show>
    </div>
  );
}

// ── Payment settings panel ────────────────────────────────────────────────────

function PaymentSettingsPanel(props: { onClose: () => void }) {
  const { t } = useI18n();
  const defaults = (): PaymentSettings => ({
    paypal:    { enabled: false, client_id: '', secret: '', mode: 'sandbox' },
    razorpay:  { enabled: false, key_id: '', key_secret: '', currency: 'INR' },
    cashfree:  { enabled: false, app_id: '', secret_key: '', mode: 'sandbox' },
    upi:       { enabled: false, upi_id: '', display_name: '' },
    manual:    { enabled: true, instructions: '' },
  });

  const [form, setForm] = createSignal<PaymentSettings>(paymentSettings() ?? defaults());

  createEffect(() => {
    const s = paymentSettings();
    if (s) setForm(s);
  });

  const set = (path: string[], value: unknown) =>
    setForm(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as PaymentSettings;
      let cur: any = next;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return next;
    });

  const save = async () => {
    await savePaymentSettings(form());
    props.onClose();
  };

  return (
    <div class="bg-elevated border border-rim rounded-2xl p-4 flex flex-col gap-5">
      <p class="text-sm font-semibold text-txt">{t('cart.payment_settings')}</p>

      {/* PayPal */}
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="pp-enabled"
            checked={form().paypal.enabled}
            onChange={e => set(['paypal', 'enabled'], e.currentTarget.checked)}
            class="rounded"
          />
          <label for="pp-enabled" class="text-sm font-medium text-txt">PayPal</label>
        </div>

        <Show when={form().paypal.enabled}>
          <div class="flex flex-col gap-2 pl-6">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.paypal_client_id')}</label>
              <input
                type="text"
                value={form().paypal.client_id}
                onInput={e => set(['paypal', 'client_id'], e.currentTarget.value)}
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       placeholder-subtle focus:outline-none focus:border-accent font-mono"
                placeholder="A..."
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.paypal_secret')}</label>
              <input
                type="password"
                value={form().paypal.secret}
                onInput={e => set(['paypal', 'secret'], e.currentTarget.value)}
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       placeholder-subtle focus:outline-none focus:border-accent font-mono"
                placeholder="E..."
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.paypal_mode')}</label>
              <div class="flex gap-2">
                <label class="flex items-center gap-1.5 text-sm text-txt cursor-pointer">
                  <input type="radio" name="pp-mode"
                    checked={form().paypal.mode === 'sandbox'}
                    onChange={() => set(['paypal', 'mode'], 'sandbox')} />
                  {t('cart.paypal_sandbox')}
                </label>
                <label class="flex items-center gap-1.5 text-sm text-txt cursor-pointer">
                  <input type="radio" name="pp-mode"
                    checked={form().paypal.mode === 'live'}
                    onChange={() => set(['paypal', 'mode'], 'live')} />
                  {t('cart.paypal_live')}
                </label>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Razorpay */}
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="rp-enabled"
            checked={form().razorpay.enabled}
            onChange={e => set(['razorpay', 'enabled'], e.currentTarget.checked)}
            class="rounded"
          />
          <label for="rp-enabled" class="text-sm font-medium text-txt">Razorpay</label>
        </div>
        <Show when={form().razorpay.enabled}>
          <div class="flex flex-col gap-2 pl-6">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.razorpay_key_id')}</label>
              <input type="text"
                value={form().razorpay.key_id}
                onInput={e => set(['razorpay', 'key_id'], e.currentTarget.value)}
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       font-mono focus:outline-none focus:border-accent"
                placeholder="rzp_test_..."
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.razorpay_key_secret')}</label>
              <input type="password"
                value={form().razorpay.key_secret}
                onInput={e => set(['razorpay', 'key_secret'], e.currentTarget.value)}
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.razorpay_currency')}</label>
              <input type="text"
                value={form().razorpay.currency}
                onInput={e => set(['razorpay', 'currency'], e.currentTarget.value.toUpperCase())}
                maxlength="3"
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       font-mono w-24 focus:outline-none focus:border-accent"
              />
            </div>
          </div>
        </Show>
      </div>

      {/* Cashfree */}
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="cf-enabled"
            checked={form().cashfree.enabled}
            onChange={e => set(['cashfree', 'enabled'], e.currentTarget.checked)}
            class="rounded"
          />
          <label for="cf-enabled" class="text-sm font-medium text-txt">Cashfree</label>
        </div>
        <Show when={form().cashfree.enabled}>
          <div class="flex flex-col gap-2 pl-6">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.cashfree_app_id')}</label>
              <input type="text"
                value={form().cashfree.app_id}
                onInput={e => set(['cashfree', 'app_id'], e.currentTarget.value)}
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       font-mono focus:outline-none focus:border-accent"
                placeholder="TEST..."
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.cashfree_secret_key')}</label>
              <input type="password"
                value={form().cashfree.secret_key}
                onInput={e => set(['cashfree', 'secret_key'], e.currentTarget.value)}
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       font-mono focus:outline-none focus:border-accent"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.cashfree_mode')}</label>
              <div class="flex gap-2">
                <label class="flex items-center gap-1.5 text-sm text-txt cursor-pointer">
                  <input type="radio" name="cf-mode"
                    checked={form().cashfree.mode === 'sandbox'}
                    onChange={() => set(['cashfree', 'mode'], 'sandbox')} />
                  {t('cart.cashfree_sandbox')}
                </label>
                <label class="flex items-center gap-1.5 text-sm text-txt cursor-pointer">
                  <input type="radio" name="cf-mode"
                    checked={form().cashfree.mode === 'production'}
                    onChange={() => set(['cashfree', 'mode'], 'production')} />
                  {t('cart.cashfree_production')}
                </label>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* UPI */}
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="upi-enabled"
            checked={form().upi.enabled}
            onChange={e => set(['upi', 'enabled'], e.currentTarget.checked)}
            class="rounded"
          />
          <label for="upi-enabled" class="text-sm font-medium text-txt">UPI</label>
        </div>
        <Show when={form().upi.enabled}>
          <div class="flex flex-col gap-2 pl-6">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.upi_id_label')}</label>
              <input type="text"
                value={form().upi.upi_id}
                onInput={e => set(['upi', 'upi_id'], e.currentTarget.value)}
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       font-mono focus:outline-none focus:border-accent"
                placeholder="yourname@upi"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-muted">{t('cart.upi_display_name')}</label>
              <input type="text"
                value={form().upi.display_name}
                onInput={e => set(['upi', 'display_name'], e.currentTarget.value)}
                class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim text-txt
                       focus:outline-none focus:border-accent"
                placeholder="Your Shop Name"
              />
            </div>
          </div>
        </Show>
      </div>

      {/* Manual */}
      <div class="flex flex-col gap-2">
        <p class="text-xs font-medium text-muted">{t('cart.manual_instructions')}</p>
        <textarea
          value={form().manual.instructions}
          onInput={e => set(['manual', 'instructions'], e.currentTarget.value)}
          rows={3}
          class="text-sm px-3 py-2 rounded-lg bg-surface border border-rim text-txt
                 placeholder-subtle focus:outline-none focus:border-accent resize-none"
          placeholder="e.g. Bank transfer to account #1234…"
        />
      </div>

      <div class="flex gap-2">
        <button
          onClick={save}
          disabled={paymentSettingsLoading()}
          class="px-4 py-2 rounded-xl bg-accent text-accent-fg text-sm font-medium
                 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {paymentSettingsLoading() ? t('cart.payment_processing') : t('cart.save_settings')}
        </button>
        <button
          onClick={props.onClose}
          class="px-4 py-2 rounded-xl text-sm font-medium text-muted hover:text-txt transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Seller: orders list ───────────────────────────────────────────────────────

function OrdersList() {
  const { t } = useI18n();
  return (
    <div class="flex flex-col gap-4">
      <Show when={ordersLoading()}>
        <div class="space-y-3">
          <For each={Array(4).fill(0)}>
            {() => <div class="h-14 bg-elevated border border-rim rounded-2xl animate-pulse" />}
          </For>
        </div>
      </Show>

      <Show when={!ordersLoading() && sellerOrders().length === 0}>
        <div class="text-center py-14">
          <MdFillReceipt_long size={48} class="text-subtle mx-auto mb-3" />
          <p class="text-muted text-sm">{t('cart.no_orders')}</p>
        </div>
      </Show>

      <Show when={!ordersLoading() && sellerOrders().length > 0}>
        <div class="bg-elevated border border-rim rounded-2xl divide-y divide-rim overflow-hidden">
          <For each={sellerOrders()}>
            {(ord) => (
              <button
                onClick={() => loadSellerOrder(ord.hash!)}
                class="w-full flex items-center gap-3 p-4 hover:bg-surface text-left transition-colors"
              >
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-txt truncate">
                    {ord.buyer_name || ord.buyer}
                  </p>
                  <p class="text-xs text-muted mt-0.5 truncate">
                    {ord.hash?.slice(0, 12)}… · {ord.subtotal}
                    <Show when={ord.payment}>
                      {' · '}<span class="text-accent">{ord.payment!.provider}</span>
                    </Show>
                  </p>
                </div>
                <StatusBadge paid={ord.paid} fulfilled={ord.flags?.fulfilled} exception={ord.flags?.exception} />
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

// ── Seller: order detail ──────────────────────────────────────────────────────

function OrderDetail() {
  const { t } = useI18n();
  const ord = selectedOrder;
  const [noteText, setNoteText] = createSignal('');

  const submitNote = async () => {
    const text = noteText().trim();
    if (!text || !ord()?.hash) return;
    await addOrderNote(ord()!.hash!, text);
    setNoteText('');
  };

  return (
    <Show when={ord()}>
      <div class="flex flex-col gap-4">
        <button
          onClick={() => setSelectedOrder(null)}
          class="text-sm text-accent hover:underline self-start"
        >
          {t('cart.back_to_orders')}
        </button>

        <Show when={orderDetailLoading()}>
          <div class="h-40 bg-elevated border border-rim rounded-2xl animate-pulse" />
        </Show>

        <Show when={!orderDetailLoading()}>
          <div class="bg-elevated border border-rim rounded-2xl p-4 flex flex-col gap-2">
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-semibold text-txt">{ord()!.buyer_name || ord()!.buyer}</p>
                <p class="text-xs text-muted mt-0.5">#{ord()!.hash?.slice(0, 16)}</p>
                <Show when={ord()!.payment}>
                  <p class="text-xs text-accent mt-0.5">
                    {t('cart.paid_via')} {ord()!.payment!.provider}
                    {ord()!.payment!.txn_id ? ` · ${ord()!.payment!.txn_id.slice(0, 12)}…` : ''}
                  </p>
                </Show>
              </div>
              <StatusBadge paid={ord()!.paid} fulfilled={ord()!.flags?.fulfilled} exception={ord()!.flags?.exception} />
            </div>
            <div class="flex items-center justify-between text-sm pt-1">
              <span class="text-muted">{t('cart.order_total')}</span>
              <span class="font-semibold text-txt">{ord()!.subtotal}</span>
            </div>
            <Show when={!ord()!.paid}>
              <button
                onClick={() => markOrderPaid(ord()!.hash!)}
                class="mt-1 w-full py-2 rounded-xl bg-accent text-accent-fg text-sm font-medium
                       hover:opacity-90 transition-opacity"
              >
                {t('cart.mark_paid')}
              </button>
            </Show>
          </div>

          <div class="bg-elevated border border-rim rounded-2xl overflow-hidden">
            <p class="text-xs font-semibold text-muted uppercase tracking-wide px-4 pt-3 pb-2">
              {t('cart.order_items')}
            </p>
            <div class="divide-y divide-rim">
              <For each={ord()!.items}>
                {(item) => (
                  <div class="flex items-center gap-3 px-4 py-3">
                    <div class="flex-1 min-w-0">
                      <p class="text-sm text-txt truncate">{item.desc}</p>
                      <p class="text-xs text-muted mt-0.5">{item.price} × {item.qty}</p>
                    </div>
                    <ItemStatusBadge item={item} />
                    <div class="flex gap-1 shrink-0">
                      <Show when={!item.fulfilled}>
                        <button
                          onClick={() => fulfillItem(ord()!.hash!, item.id)}
                          class="px-2 py-1 rounded-lg text-xs font-medium bg-green-100 dark:bg-green-900/30
                                 text-green-700 dark:text-green-400 hover:opacity-80 transition-opacity"
                        >
                          {t('cart.fulfill_item')}
                        </button>
                        <button
                          onClick={() => cancelItem(ord()!.hash!, item.id)}
                          class="px-2 py-1 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-900/30
                                 text-red-700 dark:text-red-400 hover:opacity-80 transition-opacity"
                        >
                          {t('cart.cancel_item')}
                        </button>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>

          <div class="bg-elevated border border-rim rounded-2xl p-4 flex flex-col gap-3">
            <p class="text-xs font-semibold text-muted uppercase tracking-wide">
              {t('cart.order_notes')}
            </p>
            <Show when={(ord()!.notes ?? []).length === 0}>
              <p class="text-xs text-subtle italic">—</p>
            </Show>
            <For each={ord()!.notes ?? []}>
              {(note) => (
                <p class="text-xs text-muted border-l-2 border-accent pl-2">{note}</p>
              )}
            </For>
            <div class="flex gap-2 mt-1">
              <input
                type="text"
                value={noteText()}
                onInput={e => setNoteText(e.currentTarget.value)}
                onKeyDown={e => e.key === 'Enter' && submitNote()}
                placeholder={t('cart.note_placeholder')}
                class="flex-1 text-sm px-3 py-1.5 rounded-lg bg-surface border border-rim
                       text-txt placeholder-subtle focus:outline-none focus:border-accent"
              />
              <button
                onClick={submitNote}
                disabled={!noteText().trim()}
                class="px-3 py-1.5 rounded-lg text-sm font-medium bg-accent text-accent-fg
                       hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {t('cart.add_note')}
              </button>
            </div>
          </div>
        </Show>
      </div>
    </Show>
  );
}

// ── Status badges ─────────────────────────────────────────────────────────────

function StatusBadge(props: { paid?: boolean; fulfilled?: boolean; exception?: boolean }) {
  const { t } = useI18n();
  return (
    <div class="flex flex-wrap gap-1 justify-end shrink-0">
      <Show when={props.exception}>
        <span class="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full
                     bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
          <MdFillError size={10} /> {t('cart.order_exception')}
        </span>
      </Show>
      <span class={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${props.paid
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
        {props.paid ? t('cart.order_paid') : t('cart.order_unpaid')}
      </span>
      <span class={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${props.fulfilled
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
        : 'bg-surface text-muted'}`}>
        {props.fulfilled ? t('cart.order_fulfilled') : t('cart.order_pending')}
      </span>
    </div>
  );
}

function ItemStatusBadge(props: { item: import('../api').OrderItem }) {
  const { t } = useI18n();
  const item = () => props.item;
  return (
    <Show when={item().fulfilled !== undefined}>
      <span class={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
        item().exception
          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
          : item().fulfilled
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-surface text-muted'
      }`}>
        {item().exception ? t('cart.item_exception') : item().fulfilled ? t('cart.item_fulfilled') : t('cart.item_pending')}
      </span>
    </Show>
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
