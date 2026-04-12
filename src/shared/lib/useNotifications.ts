// useNotifications.ts
import { createStore, produce } from "solid-js/store";
import { createSignal, onCleanup, onMount } from "solid-js";
import { NotificationService } from "./notificationService";
import type {
  NotificationItem,
  NotificationType,
  NotificationPayload,
} from "./notificationService";

export interface PanelState {
  count: number;
  items: NotificationItem[];
  hasMore: boolean;
  loading: boolean;
  open: boolean;
  threadTopOnly: boolean;
}

export type NotificationsStore = Record<NotificationType, PanelState>;

const TYPES: NotificationType[] = [
  "dm", "home", "intros", "files", "network", "pubs", "notify", "all_events",
];

const defaultPanel = (): PanelState => ({
  count: 0,
  items: [],
  hasMore: true,
  loading: false,
  open: false,
  threadTopOnly: false,
});

export function useNotifications() {
  const [store, setStore] = createStore<NotificationsStore>(
    Object.fromEntries(TYPES.map((t) => [t, defaultPanel()])) as NotificationsStore
  );
type Toast = { id: number; msg: string; variant: string };
const [toasts, setToasts] = createSignal<Toast[]>([]);
  // ── Define markAllSeen before svc so the payload handler can reference it ──

  const markAllSeen = (type: NotificationType) => {
    const unseen = store[type].items.filter((i) => i.unseen);
    if (!unseen.length) return;

    setStore(
      type,
      produce((s) => {
        s.items.forEach((i) => {
          if (i.unseen) i.unseen = false;
        });
        s.count = 0;
      })
    );

    unseen.forEach((item, i) => {
      setTimeout(() => svc.markRead(item.notify_id), i * 50);
    });
  };

  // ── Service ───────────────────────────────────────────────────────────────

  const svc = new NotificationService(
    (payload: NotificationPayload, replace: boolean, followup: boolean) => {
      TYPES.forEach((type) => {
        const bucket = payload[type];
        if (!bucket) return;

        setStore(type, "count", bucket.count);
        setStore(type, "hasMore", bucket.offset !== -1);
        setStore(type, "loading", false);

        if (!bucket.notifications.length) return;

        if (replace && !followup) {
          setStore(type, "items", bucket.notifications);
          if (store[type].open) {
            setTimeout(() => markAllSeen(type), 0);
          }
        } else {
          setStore(
            type,
            produce((s) => {
              const existing = new Set(s.items.map((i) => i.notify_id));
              const fresh = bucket.notifications.filter(
                (n) => !existing.has(n.notify_id)
              );
              if (!replace && !followup) {
                s.items.unshift(...fresh);
              } else {
                s.items.push(...fresh);
              }
            })
          );
        }
      });
    },
    (msg, variant) => {
      const id = Date.now();
      setToasts((t) => [...t, { id, msg, variant }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
    }
  );

  onMount(() => svc.init());
  onCleanup(() => svc.destroy());

  // ── Actions ───────────────────────────────────────────────────────────────

  const togglePanel = (type: NotificationType) => {
    const isOpening = !store[type].open;
    TYPES.forEach((t) => setStore(t, "open", false));
    if (isOpening) {
      setStore(type, "open", true);
      setStore(type, "loading", true);
      svc.fetchItems(type, true);
    }
  };

  const handleScroll = (type: NotificationType, el: HTMLElement) => {
    const nearBottom =
      el.scrollTop > el.scrollHeight - el.clientHeight - el.scrollHeight / 7;
    if (nearBottom && store[type].hasMore && !store[type].loading) {
      setStore(type, "loading", true);
      svc.loadMore(type);
    }
  };

  const markRead = (type: NotificationType, id: string) => {
    svc.markRead(id);
    setStore(
      type,
      produce((s) => {
        const item = s.items.find((i) => i.notify_id === id);
        if (item) item.unseen = false;
      })
    );
  };

  const toggleThreadTop = (type: NotificationType) => {
    setStore(type, "threadTopOnly", (v) => !v);
  };

  return {
    store,
    toasts,
    togglePanel,
    handleScroll,
    markRead,
    markAllSeen,
    toggleThreadTop,
    formatCount: (n: number) => svc.formatCount(n),
  };
}
