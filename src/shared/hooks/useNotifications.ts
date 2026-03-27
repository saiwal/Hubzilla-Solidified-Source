// useNotifications.ts
import { createStore, produce } from "solid-js/store";
import { onCleanup, onMount } from "solid-js";
import { NotificationService } from "./notificationService";
import type { NotificationItem, NotificationType, NotificationPayload } from "./notificationService";

export interface PanelState {
  count: number;
  items: NotificationItem[];
  hasMore: boolean;
  loading: boolean;
  open: boolean;
  threadTopOnly: boolean; // network panel: show only top-level posts
}

export type NotificationsStore = Record<NotificationType, PanelState>;

const TYPES: NotificationType[] = ["dm", "home", "intros", "files", "network"];

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

  const [toasts, setToasts] = createStore<
    { id: number; msg: string; variant: string }[]
  >([]);

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
          // First open — replace all items
          setStore(type, "items", bucket.notifications);
        } else {
          setStore(
            type,
            produce((s) => {
              const existing = new Set(s.items.map((i) => i.notify_id));
              const fresh = bucket.notifications.filter(
                (n) => !existing.has(n.notify_id)
              );
              if (!replace && !followup) {
                // New real-time notifications — prepend
                s.items.unshift(...fresh);
              } else {
                // Infinite scroll followup — append
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
    toggleThreadTop,
    formatCount: (n: number) => svc.formatCount(n),
  };
}
