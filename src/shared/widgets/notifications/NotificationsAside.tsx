/**
 * NotificationsAside.tsx
 *
 * Boot sequence (runs exactly once after auth settles):
 *   1. fetchCounts() from /sse_bs  → populate badges
 *   2. connectSSE()               → EventSource /sse for push updates
 *   3. setInterval every 60s      → refresh counts + flush rmids
 *
 * On SSE error → falls back to polling /sse every 60s instead.
 *
 * Clicking /display/{uuid} notifications → PostDetailModal
 * Everything else                        → normal link navigation
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
import { useAuth } from "@/shared/store/auth-store";

const PostDetailModal = lazy(() => import("@/shared/views/PostDetailModal"));

// ── Types ─────────────────────────────────────────────────────────────────────

interface HzNotification {
  photo?: string;
  name?: string;
  message?: string;
  notify_link?: string;
  created?: string;
  item_id?: string;
}

interface StreamBucket {
  count: number;
  notifications: HzNotification[];
  offset?: number;
}

interface SsePayload {
  network?: StreamBucket;
  dm?: StreamBucket;
  home?: StreamBucket;
  notify?: StreamBucket;
  intros?: StreamBucket;
  files?: StreamBucket;
  all_events?: StreamBucket;
  register?: StreamBucket;
  notice?: { notifications: HzNotification[] };
  info?: { notifications: HzNotification[] };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const POLL_MS = 60_000;
const FETCHABLE = new Set(["network", "dm", "home"]);
const STREAM_META: Record<string, { label: string; icon: string; href?: string }> = {
  network:    { label: "Network",  icon: "🌐", href: "/network" },
  dm:         { label: "Messages", icon: "✉️",  href: "/mail" },
  home:       { label: "Channel",  icon: "🏠", href: "/channel" },
  notify:     { label: "System",   icon: "🔔" },
  intros:     { label: "Intros",   icon: "👋", href: "/connections" },
  files:      { label: "Files",    icon: "📎" },
  all_events: { label: "Events",   icon: "📅", href: "/calendar" },
  register:   { label: "Signups",  icon: "📝" },
};
const BUCKET_KEYS = Object.keys(STREAM_META);

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchCounts(rmids?: string[]): Promise<SsePayload> {
  const url = new URL("/sse_bs", location.origin);
  if (rmids?.length) url.searchParams.set("sse_rmids", rmids.join(","));
  const res = await fetch(url.toString(), { credentials: "same-origin" });
  if (!res.ok) throw new Error("sse_bs fetch failed");
  return res.json();
}

async function fetchBucketNotifications(key: string): Promise<HzNotification[]> {
  const res = await fetch(`/sse_bs/${key}`, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`sse_bs/${key} failed`);
  const data: SsePayload = await res.json();
  return (data[key as keyof SsePayload] as StreamBucket | undefined)?.notifications ?? [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDisplayUuid(href?: string): string | null {
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
    return u.pathname + u.search;
  } catch { return href; }
}

function relativeTime(created?: string): string {
  if (!created) return "";
  const d = new Date(created.replace(" ", "T") + "Z");
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function mergeBucket(existing: StreamBucket, incoming: Partial<StreamBucket>): StreamBucket {
  return {
    count: incoming.count ?? existing.count,
    notifications: incoming.notifications?.length
      ? [...incoming.notifications, ...existing.notifications].slice(0, 50)
      : existing.notifications,
    offset: incoming.offset ?? existing.offset,
  };
}

// ── NotifRow ──────────────────────────────────────────────────────────────────

function NotifRow(props: {
  n: HzNotification;
  seen: boolean;
  onSeen: (id: string) => void;
  onOpenModal: (uuid: string) => void;
}) {
  const uuid = () => extractDisplayUuid(props.n.notify_link);

  const handleClick = (e: MouseEvent) => {
    const u = uuid();
    if (props.n.item_id) props.onSeen(props.n.item_id);
    if (u) {
      e.preventDefault();
      props.onOpenModal(u);
    }
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
          <Show when={props.n.created}>
            <p class="text-[10px] text-gray-400">{relativeTime(props.n.created)}</p>
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
  seenIds: Set<string>;
  onSeen: (id: string) => void;
  onMarkAllRead: (ids: string[]) => void;
  onOpenModal: (uuid: string) => void;
}) {
  const [open, setOpen] = createSignal(false);
  const meta = STREAM_META[props.id] ?? { label: props.id, icon: "📌" };
  const needsFetch = FETCHABLE.has(props.id);

  const [fetchKey, setFetchKey] = createSignal<string | null>(null);
  const [fetched, { refetch: refetchRows }] = createResource(fetchKey, fetchBucketNotifications);

  const toggle = () => {
    const next = !open();
    setOpen(next);
    if (next && needsFetch) {
      if (!fetchKey()) setFetchKey(props.id);
      else refetchRows();
    }
  };

  // Re-fetch rows when count increases while section is open
  let prevCount = props.bucket.count;
  createEffect(() => {
    const count = props.bucket.count;
    if (open() && needsFetch && fetchKey() && count > prevCount) refetchRows();
    prevCount = count;
  });

  const notifications = (): HzNotification[] =>
    needsFetch ? (fetched() ?? props.bucket.notifications) : props.bucket.notifications;

  const isLoading = () => needsFetch && !!fetchKey() && fetched.loading;

  const unseenIds = () =>
    notifications()
      .map((n) => n.item_id)
      .filter((id): id is string => !!id && !props.seenIds.has(id));

  const markSectionRead = (e: MouseEvent) => {
    e.stopPropagation();
    const ids = unseenIds();
    if (ids.length) props.onMarkAllRead(ids);
  };

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
          <Show when={open() && unseenIds().length > 0}>
            <button
              onClick={markSectionRead}
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
          <svg class={`w-3 h-3 text-gray-400 transition-transform ${open() ? "" : "-rotate-90"}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                {(n) => (
                  <NotifRow
                    n={n}
                    seen={!!n.item_id && props.seenIds.has(n.item_id)}
                    onSeen={props.onSeen}
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
    Object.fromEntries(BUCKET_KEYS.map((k) => [k, emptyBucket()])),
  );
  const [notices, setNotices] = createSignal<HzNotification[]>([]);
  const [connStatus, setConnStatus] = createSignal<ConnStatus>("connecting");
  const [booted, setBooted] = createSignal(false);
  const [refreshing, setRefreshing] = createSignal(false);
  const [modalUuid, setModalUuid] = createSignal<string | null>(null);

  // ── Seen tracking (reactive Set) ──────────────────────────────────────────
  const seenKey = "hz:notif:seen";
  const [seenIds, setSeenIds] = createSignal<Set<string>>((() => {
    try { return new Set(JSON.parse(sessionStorage.getItem(seenKey) ?? "[]")); }
    catch { return new Set(); }
  })());

  const persistSeen = (s: Set<string>) => {
    sessionStorage.setItem(seenKey, JSON.stringify([...s]));
    setSeenIds(new Set(s));
  };

  const onSeen = (id: string) => {
    if (seenIds().has(id)) return;
    const next = new Set(seenIds());
    next.add(id);
    persistSeen(next);
    // Queue rmid — will be sent on next fetchCounts call
    queuedRmids.add(id);
  };

  const onMarkAllRead = (ids: string[]) => {
    const next = new Set(seenIds());
    ids.forEach((id) => { next.add(id); queuedRmids.add(id); });
    persistSeen(next);
    // Optimistically zero counts
    setBuckets((prev) => {
      const next2 = { ...prev };
      for (const key of BUCKET_KEYS) next2[key] = { ...next2[key], count: 0 };
      return next2;
    });
  };

  // rmids are accumulated here between fetchCounts calls — plain Set, not signal
  const queuedRmids = new Set<string>();

  // ── Payload merge ─────────────────────────────────────────────────────────
  const applyPayload = (data: SsePayload) => {
    setBuckets((prev) => {
      const next = { ...prev };
      for (const key of BUCKET_KEYS) {
        const incoming = data[key as keyof SsePayload] as StreamBucket | undefined;
        if (incoming) next[key] = mergeBucket(prev[key] ?? emptyBucket(), incoming);
      }
      return next;
    });
    const newNotices = [
      ...(data.notice?.notifications ?? []),
      ...(data.info?.notifications ?? []),
    ];
    if (newNotices.length) setNotices((prev) => [...newNotices, ...prev]);
  };

  const doFetchCounts = async () => {
    const rmids = queuedRmids.size ? [...queuedRmids] : undefined;
    queuedRmids.clear();
    applyPayload(await fetchCounts(rmids));
  };

  // ── Infrastructure — all owned here, cleaned up in onCleanup ─────────────
  let es: EventSource | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let fallbackToPoll = false;

  const clearInterval_ = () => {
    if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
  };

  const startInterval = () => {
    clearInterval_();
    intervalId = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        if (fallbackToPoll) {
          // Poll /sse for pushed notifications + refresh counts
          const res = await fetch("/sse", { credentials: "same-origin" });
          if (res.ok) {
            const data: SsePayload = await res.json();
            if (data && Object.keys(data).length) applyPayload(data);
          }
        }
        await doFetchCounts();
        setConnStatus(fallbackToPoll ? "polling" : "live");
      } catch {
        setConnStatus("error");
      }
    }, POLL_MS);
  };

  const connectSSE = () => {
    if (es) { es.close(); es = null; }
    es = new EventSource("/sse", { withCredentials: true });

    es.addEventListener("notifications", (e: MessageEvent) => {
      try {
        const data: SsePayload = JSON.parse(e.data);
        if (data && Object.keys(data).length) applyPayload(data);
      } catch { /* ignore parse errors */ }
    });

    es.addEventListener("heartbeat", () => {
      fallbackToPoll = false;
      setConnStatus("live");
    });

    es.onopen = () => setConnStatus("connecting");

    es.onerror = () => {
      // EventSource auto-retries — if it keeps erroring it's likely sse_enabled=0
      // and the endpoint returns JSON. Switch to manual polling.
      es?.close();
      es = null;
      fallbackToPoll = true;
      setConnStatus("polling");
      // The existing interval will handle polling from now on
    };
  };

  // ── Boot: runs exactly once when auth uid is known ────────────────────────
  // Use a plain flag rather than a reactive effect to prevent re-runs.
  let started = false;

  createEffect(() => {
    // Track auth().uid reactively
    const uid = auth()?.uid;
    if (auth.loading) return;      // still loading — wait
    if (started) return;           // already booted — don't re-run
    started = true;

    if (!uid) {
      setConnStatus("error");
      setBooted(true);
      return;
    }

    // Boot sequence
    doFetchCounts()
      .then(() => {
        setBooted(true);
        connectSSE();
        startInterval();
      })
      .catch((e) => {
        console.error("[notif] boot failed", e);
        setBooted(true);
        setConnStatus("error");
      });
  });

  onCleanup(() => {
    es?.close();
    clearInterval_();
  });

  // ── Manual refresh ────────────────────────────────────────────────────────
  const manualRefresh = async () => {
    if (refreshing()) return;
    setRefreshing(true);
    try { await doFetchCounts(); } finally { setRefreshing(false); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalCount = createMemo(() =>
    Object.values(buckets()).reduce((sum, b) => sum + (b.count ?? 0), 0),
  );

  const activeBuckets = createMemo(() =>
    BUCKET_KEYS.filter((key) => {
      const b = buckets()[key];
      return b && (b.count > 0 || b.notifications.length > 0);
    }),
  );

  const hasAnySeen = createMemo(() =>
    activeBuckets().some((key) =>
      buckets()[key].notifications.some((n) => n.item_id && !seenIds().has(n.item_id)),
    ),
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Show when={modalUuid()}>
        <PostDetailModal uuid={modalUuid()!} onClose={() => setModalUuid(null)} />
      </Show>

      <div class="space-y-3">
        {/* Header */}
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
            <Show when={booted() && hasAnySeen()}>
              <button
                onClick={() => {
                  const ids: string[] = [];
                  for (const b of Object.values(buckets()))
                    b.notifications.forEach((n) => { if (n.item_id) ids.push(n.item_id); });
                  onMarkAllRead(ids);
                }}
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
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors disabled:opacity-40"
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
                <div class="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 rounded-lg px-3 py-2">
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
                  seenIds={seenIds()}
                  onSeen={onSeen}
                  onMarkAllRead={onMarkAllRead}
                  onOpenModal={(uuid) => setModalUuid(uuid)}
                />
              )}
            </For>
          </div>
        </Show>

        <Show when={booted() && activeBuckets().length === 0 && notices().length === 0}>
          <div class="text-center py-2">
            <p class="text-2xl mb-1">✓</p>
            <p class="text-xs text-gray-400">All caught up</p>
          </div>
        </Show>
      </div>
    </>
  );
}
