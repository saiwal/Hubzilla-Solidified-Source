// notificationService.ts

export type NotificationType = "dm" | "home" | "intros" | "files" | "network" | "pubs" | "notify";

export interface NotificationItem {
  notify_id: string;
  b64mid: string;
  notify_link: string;
  photo: string;
  name: string;
  addr: string;
  message: string;
  when: string;
  hclass: string;
  thread_top: boolean;
  unseen: boolean;
  // network-stream extras
  mids?: string;
  body?: string;
  private_forum?: boolean;
}

/** Fired on document when a new top-level network post arrives in real-time.
 *  Listeners (e.g. your stream page) can use this to inject the post live. */
export type NetworkStreamEvent = CustomEvent<NotificationItem>;

export interface NotificationBucket {
  count: number;
  offset: number;
  notifications: NotificationItem[];
}

export type NotificationPayload = Partial<Record<NotificationType, NotificationBucket>> & {
  notice?: { notifications: string[] };
  info?: { notifications: string[] };
};

export type PayloadHandler = (
  p: NotificationPayload,
  replace: boolean,
  followup: boolean
) => void;

export type ToastHandler = (msg: string, variant: "danger" | "info") => void;

const COUNT_LIMIT = 99;

export class NotificationService {
  private onPayload: PayloadHandler;
  private onToast: ToastHandler;
  private offset: Record<NotificationType, number>;
  private isActive: boolean;
  private rmids: string[];
  private fallbackInterval: ReturnType<typeof setInterval> | null;

  constructor(onPayload: PayloadHandler, onToast: ToastHandler) {
    this.onPayload = onPayload;
    this.onToast = onToast;
    this.offset = { dm: 0, home: 0, intros: 0, files: 0, network: 0, pubs: 0, notify: 0 };
    this.isActive = false;
    this.rmids = [];
    this.fallbackInterval = null;
  }

  init() {
    this.connectSSE();
    this.bootstrapCounts();
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        (Object.keys(this.offset) as NotificationType[]).forEach(
          (k) => (this.offset[k] = 0)
        );
        this.bootstrapCounts();
      }
    });
  }

  private connectSSE() {
    if (typeof SharedWorker !== "undefined") {
      try {
        const w = new SharedWorker("/sse_worker.js");
        w.port.onmessage = (e) => this.dispatchPayload(e.data, false, false);
        w.onerror = () => this.startPollingFallback();
        w.port.start();
        return;
      } catch {
        // fall through
      }
    }
    try {
      const src = new EventSource("/sse");
      src.addEventListener("notifications", (e) =>
        this.dispatchPayload(
          JSON.parse((e as MessageEvent).data),
          false,
          false
        )
      );
      src.onerror = () => {
        src.close();
        this.startPollingFallback();
      };
    } catch {
      this.startPollingFallback();
    }
  }

  private startPollingFallback() {
    if (this.fallbackInterval) return;
    const poll = () =>
      fetch("/sse")
        .then((r) => r.json())
        .then((obj) => obj && this.dispatchPayload(obj, false, false))
        .catch(() => {});
    poll();
    this.fallbackInterval = setInterval(poll, 30_000);
  }

  async bootstrapCounts() {
    if (this.isActive) return;
    this.isActive = true;
    try {
      const body = new URLSearchParams();
      this.rmids.forEach((id) => body.append("sse_rmids[]", id));
      const res = await fetch("/sse_bs", { method: "POST", body });
      const data: NotificationPayload = await res.json();
      this.rmids = [];
      this.dispatchPayload(data, true, false);
    } finally {
      this.isActive = false;
    }
  }

  async fetchItems(type: NotificationType, replace = true, followup = false) {
    if (this.isActive) return;
    const offset = this.offset[type];
    if (offset === -1 && !replace) return;
    this.isActive = true;
    try {
      const body = new URLSearchParams({ sse_rmids: this.rmids.join(",") });
      const res = await fetch(`/sse_bs/${type}/${replace ? 0 : offset}`, {
        method: "POST",
        body,
      });
      const data: NotificationPayload = await res.json();
      this.rmids = [];
      if (data[type]) this.offset[type] = data[type]!.offset ?? -1;
      this.dispatchPayload(data, replace, followup);
    } finally {
      this.isActive = false;
    }
  }

  loadMore(type: NotificationType) {
    if (this.offset[type] !== -1) this.fetchItems(type, false, true);
  }

  private dispatchPayload(
    payload: NotificationPayload,
    replace: boolean,
    followup: boolean
  ) {
    payload.notice?.notifications.forEach((m) => this.onToast(m, "danger"));
    payload.info?.notifications.forEach((m) => this.onToast(m, "info"));

    // For real-time network notifications, fire the stream event so any
    // page-level stream listener can prepend the post immediately.
    if (!replace && !followup && payload.network?.notifications.length) {
      payload.network.notifications
        .filter((n) => n.thread_top)
        .forEach((n) => {
          document.dispatchEvent(
            new CustomEvent("hz:handleNetworkNotificationsItems", { detail: n })
          );
        });
    }

    this.onPayload(payload, replace, followup);
  }

  markRead(id: string) {
    this.rmids.push(id);
  }

  formatCount(n: number) {
    return n >= COUNT_LIMIT ? `${COUNT_LIMIT - 1}+` : String(n);
  }

  destroy() {
    if (this.fallbackInterval) clearInterval(this.fallbackInterval);
  }
}
