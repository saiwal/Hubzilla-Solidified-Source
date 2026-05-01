import {
  createSignal,
  createResource,
  createEffect,
  For,
  Show,
  createMemo,
  onCleanup,
  lazy,
} from "solid-js";
import { useAuth, updateInterval } from "@/shared/store/auth-store";
import {
  MdFillNotifications,
  MdFillClose,
  MdFillRefresh,
  MdFillDone_all,
  MdFillForum,
  MdFillPublic,
  MdFillMail,
  MdFillHome,
  MdFillPeople,
  MdFillInsert_drive_file,
  MdFillEvent,
  MdFillApp_registration,
  MdFillWifi,
  MdFillWifi_off,
  MdFillCircle,
} from "solid-icons/md";
import { setNotifCount } from "@/shared/lib/notificationCount";
const PostDetailModal = lazy(() => import("@/shared/views/PostDetailModal"));

// ── Types ─────────────────────────────────────────────────────────────────────

interface HzNotification {
  notify_id?: number;
  notify_link?: string;
  b64mid?: string;
  name?: string;
  url?: string;
  photo?: string;
  when?: string;
  message?: string;
  hclass?: string;
  addr?: string;
}

interface StreamBucket {
  count: number;
  notifications: HzNotification[];
  offset?: number;
}

type SseResponse = Record<
  string,
  StreamBucket | { notifications: HzNotification[] }
>;

// ── Constants ─────────────────────────────────────────────────────────────────

const PROBE_MS = 5_000;
const RETRY_DELAY_MS = 15_000;
const STATIC_FETCHABLE = new Set(["network", "dm", "home", "pubs"]);
const DISPLAY_ORDER = [
  "network",
  "dm",
  "home",
  "notify",
  "intros",
  "forums",
  "pubs",
  "files",
  "all_events",
  "register",
];

type BucketMeta = { label: string; Icon: any; href?: string };
const KNOWN_META: Record<string, BucketMeta> = {
  network: { label: "Network", Icon: MdFillWifi, href: "/network" },
  dm: { label: "Messages", Icon: MdFillMail, href: "/mail" },
  home: { label: "Channel", Icon: MdFillHome, href: "/channel" },
  notify: { label: "Alerts", Icon: MdFillNotifications },
  intros: { label: "Intros", Icon: MdFillPeople, href: "/connections" },
  forums: { label: "Forums", Icon: MdFillForum },
  pubs: { label: "Public", Icon: MdFillPublic },
  files: { label: "Files", Icon: MdFillInsert_drive_file },
  all_events: { label: "Events", Icon: MdFillEvent, href: "/calendar" },
  register: { label: "Signups", Icon: MdFillApp_registration },
};

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchCounts(): Promise<SseResponse> {
  const res = await fetch("/sse_bs", { credentials: "same-origin" });
  if (!res.ok) throw new Error("sse_bs fetch failed");
  return res.json();
}

async function fetchBucketRows(key: string): Promise<HzNotification[]> {
  const res = await fetch(`/sse_bs/${key}`, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`sse_bs/${key} failed`);
  const data: SseResponse = await res.json();
  return (data[key] as StreamBucket | undefined)?.notifications ?? [];
}

async function fetchForumRows(forumKeys: string[]): Promise<HzNotification[]> {
  if (!forumKeys.length) return [];
  const results = await Promise.all(forumKeys.map(fetchBucketRows));
  return results.flat();
}
async function markAllSeenAndRefetch(key: string): Promise<SseResponse> {
  const res = await fetch(`/notifications?markRead=${key}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark read");
  return res.json(); // fix: was missing ()
}
async function markSeenAndRefetch(
  b64mids: string[],
  afterRefetch: (raw: SseResponse) => void,
) {
  if (!b64mids.length) return;
  await fetch("/sse_bs", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ sse_rmids: b64mids.join(","), nquery: "" }),
  });
  try {
    const fresh = await fetchCounts();
    afterRefetch(fresh);
  } catch {
    /* silent */
  }
}

// ── Normalise ─────────────────────────────────────────────────────────────────

interface NormalisedPayload {
  buckets: Record<string, StreamBucket>;
  forumKeys: string[];
}

function normalise(raw: SseResponse): NormalisedPayload {
  const buckets: Record<string, StreamBucket> = Object.fromEntries(
    DISPLAY_ORDER.map((k) => [k, { count: 0, notifications: [] }]),
  );
  const forumKeys: string[] = [];
  let forumCount = 0;

  for (const [key, val] of Object.entries(raw)) {
    if (key === "notice" || key === "info") continue;
    const bucket = val as StreamBucket;
    if (key.startsWith("forum_")) {
      forumKeys.push(key);
      forumCount += bucket.count ?? 0;
      continue;
    }
    if (key in buckets) {
      buckets[key] = {
        count: bucket.count ?? 0,
        notifications: bucket.notifications ?? [],
      };
    }
  }
  buckets["forums"] = { count: forumCount, notifications: [] };
  return { buckets, forumKeys };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDisplayUuid(n: HzNotification): string | null {
  if (n.b64mid) return n.b64mid;
  const href = n.notify_link;
  if (!href) return null;
  try {
    const path = href.startsWith("http") ? new URL(href).pathname : href;
    const m = path.match(/\/display\/([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function toRelativePath(href?: string): string {
  if (!href) return "#";
  try {
    if (!href.startsWith("http")) return href;
    const u = new URL(href);
    return u.pathname + u.search + u.hash;
  } catch {
    return href;
  }
}

function relativeTime(when?: string): string {
  if (!when) return "";
  const d = new Date(when.replace(" ", "T") + "Z");
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function prependDeduped(
  existing: HzNotification[],
  incoming: HzNotification[],
): HzNotification[] {
  const existingMids = new Set(existing.map((n) => n.b64mid).filter(Boolean));
  const fresh = incoming.filter(
    (n) => !n.b64mid || !existingMids.has(n.b64mid),
  );
  return [...fresh, ...existing].slice(0, 50);
}

// ── NotifRow ──────────────────────────────────────────────────────────────────

function NotifRow(props: {
  n: HzNotification;
  onDismiss: (b64mid: string) => void;
  onOpenModal: (uuid: string) => void;
}) {
  const uuid = () => getDisplayUuid(props.n);

  const handleClick = (e: MouseEvent) => {
    const u = uuid();
    if (u) {
      e.preventDefault();
      props.onOpenModal(u);
    }
  };

  const handleDismiss = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (props.n.b64mid) props.onDismiss(props.n.b64mid);
  };

  return (
    <div class="flex items-start gap-1 group">
      <a
        href={toRelativePath(props.n.notify_link)}
        onClick={handleClick}
        class="flex gap-2 items-start px-2 py-1.5 rounded-lg transition-colors
               hover:bg-elevated flex-1 min-w-0"
      >
        <Show when={props.n.photo}>
          <img
            src={props.n.photo}
            alt={props.n.name ?? ""}
            class="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover"
          />
        </Show>
        <div class="min-w-0 flex-1">
          <p class="text-xs text-txt leading-snug">
            <Show when={props.n.name}>
              <span class="font-semibold">{props.n.name} </span>
            </Show>
            {props.n.message}
          </p>
          <div class="flex items-center gap-1.5 mt-0.5">
            <Show when={props.n.when}>
              <p class="text-[10px] text-muted">{relativeTime(props.n.when)}</p>
            </Show>
          </div>
        </div>
      </a>

      <Show when={props.n.b64mid}>
        <button
          onClick={handleDismiss}
          title="Mark read"
          class="shrink-0 mt-1.5 p-0.5 rounded text-subtle
                 hover:text-muted hover:bg-elevated transition-colors
                 opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <MdFillClose class="w-3.5 h-3.5" />
        </button>
      </Show>
    </div>
  );
}

// ── StreamSection ─────────────────────────────────────────────────────────────

function StreamSection(props: {
  id: string;
  bucket: StreamBucket;
  forumKeys?: string[];
  onDismiss: (b64mid: string) => void;
  onClearAll: (key: string) => void;
  onOpenModal: (uuid: string) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const meta = KNOWN_META[props.id] ?? {
    label: props.id,
    Icon: MdFillNotifications,
  };

  const isForums = () => props.id === "forums";
  const needsFetch = () => STATIC_FETCHABLE.has(props.id) || isForums();

  const [fetchTick, setFetchTick] = createSignal(0);
  const [fetched] = createResource(
    () => (needsFetch() && open() ? fetchTick() : null),
    () =>
      isForums()
        ? fetchForumRows(props.forumKeys ?? [])
        : fetchBucketRows(props.id),
  );

  const toggle = () => setOpen((o) => !o);

  let prevCount = props.bucket.count;
  createEffect(() => {
    const count = props.bucket.count;
    if (open() && needsFetch() && count > prevCount) setFetchTick((t) => t + 1);
    prevCount = count;
  });

  createEffect(() => {
    void props.bucket.notifications;
    if (open() && needsFetch()) setFetchTick((t) => t + 1);
  });

  const notifications = (): HzNotification[] =>
    needsFetch()
      ? (fetched() ?? props.bucket.notifications)
      : props.bucket.notifications;

  const isLoading = () => needsFetch() && open() && fetched.loading;

  const dismissibleMids = () =>
    notifications()
      .map((n) => n.b64mid)
      .filter((m): m is string => !!m);

  return (
    <div class="border border-rim rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={toggle}
        class="w-full flex items-center justify-between px-3 py-2
               bg-surface hover:bg-elevated transition-colors text-left"
      >
        <span class="flex items-center gap-1.5 text-xs font-semibold text-txt">
          <meta.Icon class="w-3.5 h-3.5 shrink-0" />
          <Show when={meta.href} fallback={<span>{meta.label}</span>}>
            <a
              href={meta.href}
              onClick={(e) => e.stopPropagation()}
              class="hover:underline"
            >
              {meta.label}
            </a>
          </Show>
        </span>
        <span class="flex items-center gap-1.5">
          <Show when={open() && dismissibleMids().length > 0}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                props.onClearAll(props.id);
              }}
              title="Mark all read"
              class="p-0.5 rounded text-subtle hover:text-txt hover:bg-elevated transition-colors"
            >
              <MdFillDone_all class="w-3.5 h-3.5" />
            </button>
          </Show>
          <Show when={props.bucket.count > 0}>
            <span
              class="text-[10px] font-bold bg-accent text-base rounded-full
                         px-1.5 py-0.5 min-w-[18px] text-center leading-none"
            >
              {props.bucket.count > 99 ? "99+" : props.bucket.count}
            </span>
          </Show>
          <svg
            class={`w-3 h-3 text-subtle transition-transform ${open() ? "" : "-rotate-90"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </span>
      </button>

      {/* Body */}
      <Show when={open()}>
        <div class="px-1 py-1 space-y-0.5 bg-elevated">
          <Show when={isLoading()}>
            <div class="space-y-1 px-2 py-1">
              <For each={[1, 2, 3]}>
                {() => <div class="h-8 rounded bg-surface animate-pulse" />}
              </For>
            </div>
          </Show>
          <Show when={!isLoading()}>
            <Show
              when={notifications().length > 0}
              fallback={
                <p class="text-[11px] text-subtle text-center py-3">
                  Nothing new
                </p>
              }
            >
              <For each={notifications()}>
                {(n) => (
                  <NotifRow
                    n={n}
                    onDismiss={props.onDismiss}
                    onOpenModal={props.onOpenModal}
                  />
                )}
              </For>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
}

// ── Connection dot ────────────────────────────────────────────────────────────

type ConnStatus = "connecting" | "live" | "polling" | "error";

function StatusDot(props: { status: ConnStatus }) {
  const cls = () =>
    ({
      connecting: "text-yellow-400 animate-pulse",
      live: "text-green-400",
      polling: "text-accent animate-pulse",
      error: "text-red-400",
    })[props.status];
  const title = () =>
    ({
      connecting: "Connecting…",
      live: "Live",
      polling: "Polling",
      error: "Disconnected",
    })[props.status];

  const IconComponent =
    props.status === "error" ? MdFillWifi_off : MdFillCircle;
  return <IconComponent class={`w-2 h-2 shrink-0 ${cls()}`} title={title()} />;
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function NotificationsAside() {
  const auth = useAuth();

  const emptyBucket = (): StreamBucket => ({ count: 0, notifications: [] });
  const [buckets, setBuckets] = createSignal<Record<string, StreamBucket>>(
    Object.fromEntries(DISPLAY_ORDER.map((k) => [k, emptyBucket()])),
  );
  const [forumKeys, setForumKeys] = createSignal<string[]>([]);
  const [notices, setNotices] = createSignal<HzNotification[]>([]);
  const [connStatus, setConnStatus] = createSignal<ConnStatus>("connecting");
  const [booted, setBooted] = createSignal(false);
  const [refreshing, setRefreshing] = createSignal(false);
  const [modalUuid, setModalUuid] = createSignal<string | null>(null);

  const applyRaw = (raw: SseResponse, fromSsePush = false) => {
    const { buckets: incoming, forumKeys: fk } = normalise(raw);
    if (fk.length) setForumKeys(fk);
    setBuckets((prev) => {
      const next = { ...prev };
      for (const key of DISPLAY_ORDER) {
        const inc = incoming[key];
        if (!inc) continue;
        if (fromSsePush && inc.notifications.length) {
          next[key] = {
            count: inc.count,
            notifications: prependDeduped(
              prev[key]?.notifications ?? [],
              inc.notifications,
            ),
          };
        } else {
          next[key] = inc;
        }
      }
      return next;
    });
    const nn = raw["notice"] as { notifications: HzNotification[] } | undefined;
    const ni = raw["info"] as { notifications: HzNotification[] } | undefined;
    setNotices([...(nn?.notifications ?? []), ...(ni?.notifications ?? [])]);
  };

  const doFetchCounts = async () => {
    applyRaw(await fetchCounts(), false);
  };

  const markSeen = async (b64mids: string[]) => {
    if (!b64mids.length) return;
    setBuckets((prev) => {
      const midSet = new Set(b64mids);
      const next = { ...prev };
      for (const key of DISPLAY_ORDER) {
        const b = next[key];
        if (!b) continue;
        const filtered = b.notifications.filter(
          (n) => !n.b64mid || !midSet.has(n.b64mid),
        );
        next[key] = {
          count: Math.max(
            0,
            b.count - (b.notifications.length - filtered.length),
          ),
          notifications: filtered,
        };
      }
      return next;
    });
    await markSeenAndRefetch(b64mids, (raw) => applyRaw(raw, false));
  };

  let es: EventSource | null = null;
  let probeTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let sseConfirmed = false;
  let usePolling = false;

  const clearAllTimers = () => {
    if (probeTimer) {
      clearTimeout(probeTimer);
      probeTimer = null;
    }
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPollMode = () => {
    if (usePolling) return;
    usePolling = true;
    setConnStatus("polling");
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        await doFetchCounts();
      } catch {
        setConnStatus("error");
      }
    }, updateInterval());
  };

  const connectSSE = () => {
    if (usePolling) return;
    if (es) {
      es.close();
      es = null;
    }
    es = new EventSource("/sse", { withCredentials: true });

    const onEvent = (data: SseResponse) => {
      if (!sseConfirmed) {
        sseConfirmed = true;
        if (probeTimer) {
          clearTimeout(probeTimer);
          probeTimer = null;
        }
      }
      setConnStatus("live");
      if (data && Object.keys(data).length) applyRaw(data, true);
    };

    es.addEventListener("notifications", (e: MessageEvent) => {
      try {
        onEvent(JSON.parse(e.data));
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("heartbeat", () => onEvent({}));
    es.onopen = () => setConnStatus("connecting");
    es.onerror = () => {
      es?.close();
      es = null;
      if (!sseConfirmed) {
        if (probeTimer) {
          clearTimeout(probeTimer);
          probeTimer = null;
        }
        startPollMode();
      } else {
        setConnStatus("error");
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (!usePolling) connectSSE();
        }, RETRY_DELAY_MS);
      }
    };

    probeTimer = setTimeout(() => {
      probeTimer = null;
      if (!sseConfirmed) {
        es?.close();
        es = null;
        startPollMode();
      }
    }, PROBE_MS);
  };

  let started = false;
  createEffect(() => {
    const uid = auth()?.uid;
    if (auth.loading) return;
    if (started) return;
    started = true;
    if (!uid) {
      setConnStatus("error");
      setBooted(true);
      return;
    }
    doFetchCounts()
      .then(() => {
        setBooted(true);
        connectSSE();
        pollTimer = setInterval(async () => {
          if (document.visibilityState !== "visible") return;
          try {
            await doFetchCounts();
          } catch {
            /* silent */
          }
        }, updateInterval());
      })
      .catch(() => {
        setBooted(true);
        setConnStatus("error");
      });
  });

  onCleanup(() => {
    es?.close();
    clearAllTimers();
  });

  const manualRefresh = async () => {
    if (refreshing()) return;
    setRefreshing(true);
    try {
      await doFetchCounts();
    } finally {
      setRefreshing(false);
    }
  };

  const markAllRead = () => {
    const mids: string[] = [];
    for (const b of Object.values(buckets()))
      b.notifications.forEach((n) => {
        if (n.b64mid) mids.push(n.b64mid);
      });
    if (mids.length) markSeen(mids);
  };

  const activeBuckets = createMemo(() =>
    DISPLAY_ORDER.filter((key) => {
      const b = buckets()[key];
      return b && (b.count > 0 || b.notifications.length > 0);
    }),
  );

  const hasAnyCount = createMemo(() =>
    DISPLAY_ORDER.some((k) => (buckets()[k]?.count ?? 0) > 0),
  );
  createEffect(() => {
    const total = DISPLAY_ORDER.reduce(
      (sum, k) => sum + (buckets()[k]?.count ?? 0),
      0,
    );
    setNotifCount(total);
  });

  return (
    <>
      <Show when={modalUuid()}>
        <PostDetailModal
          uuid={modalUuid()!}
          onClose={() => setModalUuid(null)}
        />
      </Show>

      <div class="space-y-3">
        {/* Header */}
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-txt flex items-center gap-1.5">
            <StatusDot status={connStatus()} />
            Notifications
          </h3>
          <div class="flex items-center gap-1.5">
            <Show when={booted() && hasAnyCount()}>
              <button
                onClick={markAllRead}
                title="Mark all read"
                class="p-1 rounded text-subtle hover:text-txt hover:bg-elevated transition-colors"
              >
                <MdFillDone_all class="w-4 h-4" />
              </button>
            </Show>
            <button
              onClick={manualRefresh}
              disabled={refreshing()}
              title="Refresh"
              class="p-1 rounded text-subtle hover:text-txt hover:bg-elevated
                     transition-colors disabled:opacity-40"
            >
              <MdFillRefresh
                class={`w-4 h-4 ${refreshing() ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <Show when={!auth.loading && !auth()?.isLoggedIn}>
          <p class="text-xs text-subtle text-center py-4">
            Sign in to see notifications
          </p>
        </Show>

        <Show when={!booted()}>
          <div class="space-y-2">
            <For each={[1, 2, 3]}>
              {() => <div class="h-10 rounded-xl bg-elevated animate-pulse" />}
            </For>
          </div>
        </Show>

        <Show when={notices().length > 0}>
          <div class="space-y-1">
            <For each={notices()}>
              {(n) => (
                <div class="text-xs text-accent-txt bg-accent-muted rounded-lg px-3 py-2">
                  {n.message}
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={booted() && activeBuckets().length > 0}>
          <div class="space-y-2">
            <For each={activeBuckets()}>
              {(key) => (
                <StreamSection
                  id={key}
                  bucket={buckets()[key]}
                  forumKeys={key === "forums" ? forumKeys() : undefined}
                  onDismiss={(mid) => markSeen([mid])}
                  onClearAll={async (key) => {
                    // Optimistically clear local state
                    const mids =
                      buckets()
                        [key]?.notifications.map((n) => n.b64mid)
                        .filter((m): m is string => !!m) ?? [];
                    if (mids.length) {
                      // const midSet = new Set(mids);
                      setBuckets((prev) => {
                        const next = { ...prev };
                        next[key] = { count: 0, notifications: [] };
                        return next;
                      });
                    }
                    // Hit the by-key endpoint, then refresh
                    try {
                      await markAllSeenAndRefetch(key);
                      await doFetchCounts();
                    } catch {
                      /* silent */
                    }
                    setBuckets((prev) => ({
                      ...prev,
                      [key]: { count: 0, notifications: [] },
                    }));
                  }}
                  onOpenModal={(uuid) => setModalUuid(uuid)}
                />
              )}
            </For>
          </div>
        </Show>

        <Show
          when={
            booted() && activeBuckets().length === 0 && notices().length === 0
          }
        >
          <div class="text-center py-2">
            <p class="text-2xl mb-1">✓</p>
            <p class="text-xs text-subtle">All caught up</p>
          </div>
        </Show>
      </div>
    </>
  );
}
