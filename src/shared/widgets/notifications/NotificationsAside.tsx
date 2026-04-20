/**
 * NotificationsAside.tsx
 *
 * Sub-fetch keys (need /sse_bs/{key} for rows):
 *   network, dm, home, pubs  — static FETCHABLE keys
 *   forum_NNN                — dynamic, discovered from base response
 *                              fetched individually, aggregated for display
 *
 * Field mapping from real /sse_bs response:
 *   notify_id    — dedup key + sse_rmids value (number). Intros have none.
 *   notify_link  — href
 *   b64mid       — uuid for PostDetailModal
 *   when         — timestamp
 *   hclass       — "notify-unseen" | "notify-seen"
 */

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

type SseResponse = Record<string, StreamBucket | { notifications: HzNotification[] }>;

// ── Constants ─────────────────────────────────────────────────────────────────

const PROBE_MS = 5_000;
const RETRY_DELAY_MS = 15_000;

// These keys need /sse_bs/{key} for rows — base call gives counts only.
// forum_NNN keys are discovered dynamically and added at runtime.
const STATIC_FETCHABLE = new Set(["network", "dm", "home", "pubs"]);

const KNOWN_META: Record<string, { label: string; icon: string; href?: string }> = {
  network:    { label: "Network",  icon: "🌐", href: "/network" },
  dm:         { label: "Messages", icon: "✉️",  href: "/mail" },
  home:       { label: "Channel",  icon: "🏠", href: "/channel" },
  notify:     { label: "Alerts",   icon: "🔔" },
  intros:     { label: "Intros",   icon: "👋", href: "/connections" },
  forums:     { label: "Forums",   icon: "💬" },
  pubs:       { label: "Public",   icon: "🌍" },
  files:      { label: "Files",    icon: "📎" },
  all_events: { label: "Events",   icon: "📅", href: "/calendar" },
  register:   { label: "Signups",  icon: "📝" },
};

// Display order for the aggregated view
const DISPLAY_ORDER = [
  "network", "dm", "home", "notify", "intros",
  "forums", "pubs", "files", "all_events", "register",
];

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchCounts(rmids?: number[]): Promise<SseResponse> {
  const url = new URL("/sse_bs", location.origin);
  if (rmids?.length) url.searchParams.set("sse_rmids", rmids.join(","));
  const res = await fetch(url.toString(), { credentials: "same-origin" });
  if (!res.ok) throw new Error("sse_bs fetch failed");
  return res.json();
}

async function fetchBucketRows(key: string): Promise<HzNotification[]> {
  const res = await fetch(`/sse_bs/${key}`, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`sse_bs/${key} failed`);
  const data: SseResponse = await res.json();
  return (data[key] as StreamBucket | undefined)?.notifications ?? [];
}

/** Fetch all forum_NNN keys in parallel and merge their rows */
async function fetchForumRows(forumKeys: string[]): Promise<HzNotification[]> {
  if (!forumKeys.length) return [];
  const results = await Promise.all(forumKeys.map(fetchBucketRows));
  return results.flat();
}

// ── Normalise raw response ────────────────────────────────────────────────────

interface NormalisedPayload {
  buckets: Record<string, StreamBucket>;
  forumKeys: string[]; // the actual forum_NNN keys discovered
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
  } catch { return null; }
}

function toRelativePath(href?: string): string {
  if (!href) return "#";
  try {
    if (!href.startsWith("http")) return href;
    const u = new URL(href);
    return u.pathname + u.search + u.hash;
  } catch { return href; }
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

function notifKey(n: HzNotification): string | number | null {
  return n.notify_id ?? n.notify_link ?? null;
}

function prependDeduped(
  existing: HzNotification[],
  incoming: HzNotification[],
): HzNotification[] {
  const existingKeys = new Set(existing.map(notifKey).filter((k) => k !== null));
  const fresh = incoming.filter((n) => {
    const k = notifKey(n);
    return k === null || !existingKeys.has(k);
  });
  return [...fresh, ...existing].slice(0, 50);
}

// ── NotifRow ──────────────────────────────────────────────────────────────────

function NotifRow(props: {
  n: HzNotification;
  seen: boolean;
  onSeen: (key: string | number) => void;
  onOpenModal: (uuid: string) => void;
}) {
  const uuid = () => getDisplayUuid(props.n);
  const key = () => notifKey(props.n);

  const handleClick = (e: MouseEvent) => {
    const k = key();
    if (k !== null) props.onSeen(k);
    const u = uuid();
    if (u) { e.preventDefault(); props.onOpenModal(u); }
  };

  return (
    <a
      href={toRelativePath(props.n.notify_link)}
      onClick={handleClick}
      class="flex gap-2 items-start px-2 py-1.5 rounded-lg transition-colors
             hover:bg-gray-100 dark:hover:bg-gray-700"
      classList={{ "opacity-50": props.seen }}
    >
      <Show when={props.n.photo}>
        <img src={props.n.photo} alt={props.n.name ?? ""}
          class="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover" />
      </Show>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
          <Show when={props.n.name}>
            <span class="font-semibold">{props.n.name} </span>
          </Show>
          {props.n.message}
        </p>
        <div class="flex items-center gap-1.5 mt-0.5">
          <Show when={props.n.when}>
            <p class="text-[10px] text-gray-400">{relativeTime(props.n.when)}</p>
          </Show>
          <Show when={uuid()}>
            <span class="text-[9px] text-violet-400 dark:text-violet-500">· preview</span>
          </Show>
        </div>
      </div>
    </a>
  );
}

// ── StreamSection ─────────────────────────────────────────────────────────────

function StreamSection(props: {
  id: string;
  bucket: StreamBucket;
  /** Raw forum_NNN keys — only set for id="forums" */
  forumKeys?: string[];
  seenKeys: Set<string | number>;
  onSeen: (key: string | number) => void;
  onMarkAllRead: (keys: Array<string | number>) => void;
  onOpenModal: (uuid: string) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const meta = KNOWN_META[props.id] ?? { label: props.id, icon: "📌" };

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

  const notifications = (): HzNotification[] =>
    needsFetch() ? (fetched() ?? props.bucket.notifications) : props.bucket.notifications;

  const isLoading = () => needsFetch() && open() && fetched.loading;

  const unseenKeys = () =>
    notifications()
      .map(notifKey)
      .filter((k): k is string | number => k !== null && !props.seenKeys.has(k));

  return (
    <div class="border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        class="w-full flex items-center justify-between px-3 py-2
               bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700
               transition-colors text-left"
      >
        <span class="flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
          <span>{meta.icon}</span>
          <Show when={meta.href} fallback={<span>{meta.label}</span>}>
            <a href={meta.href} onClick={(e) => e.stopPropagation()} class="hover:underline">
              {meta.label}
            </a>
          </Show>
        </span>
        <span class="flex items-center gap-1.5">
          <Show when={open() && unseenKeys().length > 0}>
            <button
              onClick={(e) => { e.stopPropagation(); props.onMarkAllRead(unseenKeys()); }}
              class="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                     underline underline-offset-2 transition-colors"
            >
              clear
            </button>
          </Show>
          <Show when={props.bucket.count > 0}>
            <span class="text-[10px] font-bold bg-blue-500 text-white rounded-full
                         px-1.5 py-0.5 min-w-[18px] text-center leading-none">
              {props.bucket.count > 99 ? "99+" : props.bucket.count}
            </span>
          </Show>
          <svg
            class={`w-3 h-3 text-gray-400 transition-transform ${open() ? "" : "-rotate-90"}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <Show when={open()}>
        <div class="px-1 py-1 space-y-0.5 bg-white dark:bg-gray-800/50">
          <Show when={isLoading()}>
            <div class="space-y-1 px-2 py-1">
              <For each={[1, 2, 3]}>
                {() => <div class="h-8 rounded bg-gray-100 dark:bg-gray-700 animate-pulse" />}
              </For>
            </div>
          </Show>
          <Show when={!isLoading()}>
            <Show
              when={notifications().length > 0}
              fallback={<p class="text-[11px] text-gray-400 text-center py-3">Nothing new</p>}
            >
              <For each={notifications()}>
                {(n) => {
                  const k = notifKey(n);
                  return (
                    <NotifRow
                      n={n}
                      seen={k !== null && props.seenKeys.has(k)}
                      onSeen={props.onSeen}
                      onOpenModal={props.onOpenModal}
                    />
                  );
                }}
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
  const cfg = () => ({
    connecting: { dot: "bg-yellow-400 animate-pulse", title: "Connecting…" },
    live:       { dot: "bg-green-400",                title: "Live" },
    polling:    { dot: "bg-blue-400 animate-pulse",   title: "Polling" },
    error:      { dot: "bg-red-400",                  title: "Disconnected" },
  }[props.status]);
  return <span title={cfg().title} class={`inline-block w-1.5 h-1.5 rounded-full ${cfg().dot}`} />;
}

// ── Main widget ───────────────────────────────────────────────────────────────

export default function NotificationsAside() {
  const auth = useAuth();

  const emptyBucket = (): StreamBucket => ({ count: 0, notifications: [] });
  const [buckets, setBuckets] = createSignal<Record<string, StreamBucket>>(
    Object.fromEntries(DISPLAY_ORDER.map((k) => [k, emptyBucket()])),
  );
  // Remembered across polls so StreamSection can sub-fetch the right keys
  const [forumKeys, setForumKeys] = createSignal<string[]>([]);
  const [notices, setNotices] = createSignal<HzNotification[]>([]);
  const [connStatus, setConnStatus] = createSignal<ConnStatus>("connecting");
  const [booted, setBooted] = createSignal(false);
  const [refreshing, setRefreshing] = createSignal(false);
  const [modalUuid, setModalUuid] = createSignal<string | null>(null);

  // ── Seen tracking ─────────────────────────────────────────────────────────
  const seenStorageKey = "hz:notif:seen";
  const [seenKeys, setSeenKeys] = createSignal<Set<string | number>>((() => {
    try {
      return new Set<string | number>(
        JSON.parse(sessionStorage.getItem(seenStorageKey) ?? "[]"),
      );
    } catch { return new Set(); }
  })());

  const persistSeen = (s: Set<string | number>) => {
    sessionStorage.setItem(seenStorageKey, JSON.stringify([...s]));
    setSeenKeys(new Set(s));
  };

  const queuedRmids = new Set<number>();

  const onSeen = (key: string | number) => {
    if (seenKeys().has(key)) return;
    const next = new Set(seenKeys());
    next.add(key);
    persistSeen(next);
    if (typeof key === "number") queuedRmids.add(key);
  };

  const onMarkAllRead = (keys: Array<string | number>) => {
    const next = new Set(seenKeys());
    keys.forEach((k) => {
      next.add(k);
      if (typeof k === "number") queuedRmids.add(k);
    });
    persistSeen(next);
    setBuckets((prev) => {
      const next2 = { ...prev };
      for (const key of DISPLAY_ORDER) next2[key] = { ...next2[key], count: 0 };
      return next2;
    });
  };

  // ── Payload application ───────────────────────────────────────────────────
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
            notifications: prependDeduped(prev[key]?.notifications ?? [], inc.notifications),
          };
        } else {
          // Poll/boot → replace entirely, no accumulation
          next[key] = inc;
        }
      }
      return next;
    });

    const raw_notice = raw["notice"] as { notifications: HzNotification[] } | undefined;
    const raw_info   = raw["info"]   as { notifications: HzNotification[] } | undefined;
    setNotices([
      ...(raw_notice?.notifications ?? []),
      ...(raw_info?.notifications   ?? []),
    ]);
  };

  const doFetchCounts = async () => {
    const rmids = queuedRmids.size ? [...queuedRmids] : undefined;
    queuedRmids.clear();
    applyRaw(await fetchCounts(rmids), false);
  };

  // ── SSE probe-then-fallback ───────────────────────────────────────────────
  let es: EventSource | null = null;
  let probeTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let sseConfirmed = false;
  let usePolling = false;

  const clearAllTimers = () => {
    if (probeTimer) { clearTimeout(probeTimer);  probeTimer = null; }
    if (retryTimer) { clearTimeout(retryTimer);  retryTimer = null; }
    if (pollTimer)  { clearInterval(pollTimer);  pollTimer  = null; }
  };

  const startPollMode = () => {
    if (usePolling) return;
    usePolling = true;
    setConnStatus("polling");
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try { await doFetchCounts(); } catch { setConnStatus("error"); }
    }, updateInterval());
  };

  const connectSSE = () => {
    if (usePolling) return;
    if (es) { es.close(); es = null; }
    es = new EventSource("/sse", { withCredentials: true });

    const onEvent = (data: SseResponse) => {
      if (!sseConfirmed) {
        sseConfirmed = true;
        if (probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
      }
      setConnStatus("live");
      if (data && Object.keys(data).length) applyRaw(data, true);
    };

    es.addEventListener("notifications", (e: MessageEvent) => {
      try { onEvent(JSON.parse(e.data)); } catch { /* ignore */ }
    });
    es.addEventListener("heartbeat", () => onEvent({}));
    es.onopen = () => setConnStatus("connecting");
    es.onerror = () => {
      es?.close(); es = null;
      if (!sseConfirmed) {
        if (probeTimer) { clearTimeout(probeTimer); probeTimer = null; }
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
      if (!sseConfirmed) { es?.close(); es = null; startPollMode(); }
    }, PROBE_MS);
  };

  // ── Boot: exactly once ────────────────────────────────────────────────────
  let started = false;
  createEffect(() => {
    const uid = auth()?.uid;
    if (auth.loading) return;
    if (started) return;
    started = true;

    if (!uid) { setConnStatus("error"); setBooted(true); return; }

    doFetchCounts()
      .then(() => {
        setBooted(true);
        connectSSE();
        pollTimer = setInterval(async () => {
          if (document.visibilityState !== "visible") return;
          try { await doFetchCounts(); } catch { /* silent */ }
        }, updateInterval());
      })
      .catch(() => { setBooted(true); setConnStatus("error"); });
  });

  onCleanup(() => { es?.close(); clearAllTimers(); });

  const manualRefresh = async () => {
    if (refreshing()) return;
    setRefreshing(true);
    try { await doFetchCounts(); } finally { setRefreshing(false); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalCount = createMemo(() =>
    DISPLAY_ORDER.reduce((sum, k) => sum + (buckets()[k]?.count ?? 0), 0),
  );

  const activeBuckets = createMemo(() =>
    DISPLAY_ORDER.filter((key) => {
      const b = buckets()[key];
      return b && (b.count > 0 || b.notifications.length > 0);
    }),
  );

  const hasUnseen = createMemo(() =>
    activeBuckets().some((key) => buckets()[key].count > 0),
  );

  const markAllRead = () => {
    const keys: Array<string | number> = [];
    for (const b of Object.values(buckets()))
      b.notifications.forEach((n) => { const k = notifKey(n); if (k !== null) keys.push(k); });
    onMarkAllRead(keys);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Show when={modalUuid()}>
        <PostDetailModal uuid={modalUuid()!} onClose={() => setModalUuid(null)} />
      </Show>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <StatusDot status={connStatus()} />
            Notifications
            <Show when={totalCount() > 0}>
              <span class="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
                {totalCount() > 99 ? "99+" : totalCount()}
              </span>
            </Show>
          </h3>
          <div class="flex items-center gap-2">
            <Show when={booted() && hasUnseen()}>
              <button
                onClick={markAllRead}
                class="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                       underline underline-offset-2 transition-colors"
              >
                mark all read
              </button>
            </Show>
            <button
              onClick={manualRefresh}
              disabled={refreshing()}
              title="Refresh"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200
                     transition-colors disabled:opacity-40"
            >
              <svg class={`w-3.5 h-3.5 ${refreshing() ? "animate-spin" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        <Show when={!auth.loading && !auth()?.isLoggedIn}>
          <p class="text-xs text-gray-400 text-center py-4">Sign in to see notifications</p>
        </Show>

        <Show when={!booted()}>
          <div class="space-y-2">
            <For each={[1, 2, 3]}>
              {() => <div class="h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />}
            </For>
          </div>
        </Show>

        <Show when={notices().length > 0}>
          <div class="space-y-1">
            <For each={notices()}>
              {(n) => (
                <div class="text-xs text-blue-700 dark:text-blue-300
                            bg-blue-50 dark:bg-blue-950/40 rounded-lg px-3 py-2">
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
                  seenKeys={seenKeys()}
                  onSeen={onSeen}
                  onMarkAllRead={onMarkAllRead}
                  onOpenModal={(uuid) => setModalUuid(uuid)}
                />
              )}
            </For>
          </div>
        </Show>

        <Show when={booted() && activeBuckets().length === 0 && notices().length === 0}>
          <div class="text-center py-6">
            <p class="text-2xl mb-1">✓</p>
            <p class="text-xs text-gray-400">All caught up</p>
          </div>
        </Show>
      </div>
    </>
  );
}
