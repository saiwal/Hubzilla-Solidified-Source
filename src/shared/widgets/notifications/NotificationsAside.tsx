import {
  createSignal,
  createResource,
  createEffect,
  For,
  Show,
  createMemo,
  onMount,
  onCleanup,
  lazy,
} from "solid-js";
import { useI18n } from "@/i18n";
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
  MdOutlineCampaign,
} from "solid-icons/md";
import DOMPurify from "dompurify";
import { setNotifCount } from "@/shared/lib/notificationCount";
import { markNotifySeen, markItemSeen } from "@/shared/lib/markSeen";
import { showDesktopNotification } from "@/shared/lib/desktopNotify";
import { createQueryResource } from "@/shared/lib/createQueryResource";
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
const MARKREAD_SUPPORTED = new Set([
  "network", "dm", "home", "notify", "all_events", "pubs", "forums",
]);
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
  notify: { label: "Alerts", Icon: MdFillNotifications, href: "/notify" },
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
async function markAllSeen(key: string): Promise<void> {
  const res = await fetch(`/notifications?markRead=${key}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark read");
  // PHP killme() sends empty body — nothing to parse
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

interface HqNoticeEntry {
  b64mid: string;
  created: string;
  summary: string;
  author_name: string;
  author_img: string;
  href: string;
}

async function fetchNotices(): Promise<HqNoticeEntry[]> {
  const res = await fetch("/hq", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      offset: "0",
      type: "notification",
      file: "",
    }).toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: { offset: number; entries: HqNoticeEntry[] } = await res.json();
  return data.entries;
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
  // Enotify::format() (Zotlabs/Lib/Enotify.php) converts `created` from UTC to
  // the server's configured local timezone before sending it as `when` — so it
  // must be parsed as local time here, not UTC (no "Z" suffix).
  const d = new Date(when.replace(" ", "T"));
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function stripHtml(html?: string): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = DOMPurify.sanitize(html);
  return div.textContent?.trim() ?? "";
}

function decodeHtmlEntities(str: string): string {
  const ta = document.createElement("textarea");
  ta.innerHTML = str;
  return ta.value;
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
  onNotifySeen: (nid: number) => void;
  onOpenModal: (uuid: string) => void;
}) {
  const [hidden, setHidden] = createSignal(false);
  const uuid = () => getDisplayUuid(props.n);

  const [tick, setTick] = createSignal(0);
  onMount(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    onCleanup(() => clearInterval(id));
  });
  const when = () => {
    tick();
    return relativeTime(props.n.when);
  };

  const dismiss = () => {
    if (props.n.b64mid || props.n.notify_id) setHidden(true);
    if (props.n.b64mid) props.onDismiss(props.n.b64mid);
    if (props.n.notify_id) props.onNotifySeen(props.n.notify_id);
  };

  const handleClick = (e: MouseEvent) => {
    const u = uuid();
    if (u) {
      e.preventDefault();
      props.onOpenModal(u);
    }
    dismiss();
  };

  const handleDismiss = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dismiss();
  };

  return (
    <Show when={!hidden()}>
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
            <span innerHTML={DOMPurify.sanitize(props.n.message ?? "")} />
          </p>
          <div class="flex items-center gap-1.5 mt-0.5">
            <Show when={props.n.when}>
              <p class="text-[10px] text-muted">{when()}</p>
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
    </Show>
  );
}

// ── StreamSection ─────────────────────────────────────────────────────────────

function StreamSection(props: {
  id: string;
  bucket: StreamBucket;
  forumKeys?: string[];
  onDismiss: (b64mid: string) => void;
  onNotifySeen: (nid: number) => void;
  onClearAll: (key: string) => void;
  onOpenModal: (uuid: string) => void;
}) {
  const { t } = useI18n();
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
          <Show when={open() && (dismissibleMids().length > 0 || (MARKREAD_SUPPORTED.has(props.id) && props.bucket.count > 0))}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                props.onClearAll(props.id);
              }}
              title={t("ui.mark_all_read")}
              class="p-0.5 rounded text-subtle hover:text-txt hover:bg-elevated transition-colors"
            >
              <MdFillDone_all class="w-3.5 h-3.5" />
            </button>
          </Show>
          <Show when={props.bucket.count > 0}>
            <span
              class="text-[10px] font-bold bg-accent text-accent-fg rounded-full
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
                <p class="text-[11px] text-muted text-center py-3">
                  {t("ui.nothing_new")}
                </p>
              }
            >
              <For each={notifications()}>
                {(n) => (
                  <NotifRow
                    n={n}
                    onDismiss={props.onDismiss}
                    onNotifySeen={props.onNotifySeen}
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

// ── NoticeRow ─────────────────────────────────────────────────────────────────

function NoticeRow(props: {
  entry: HqNoticeEntry;
  onOpen: (uuid: string) => void;
}) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    markItemSeen(props.entry.b64mid);
    props.onOpen(props.entry.b64mid);
  };

  return (
    <a
      href={toRelativePath(props.entry.href)}
      onClick={handleClick}
      class="flex gap-2 items-start px-2 py-1.5 rounded-lg transition-colors
             hover:bg-elevated"
    >
      <Show when={props.entry.author_img}>
        <img
          src={props.entry.author_img}
          alt={props.entry.author_name}
          class="w-7 h-7 rounded-full shrink-0 mt-0.5 object-cover"
        />
      </Show>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-txt leading-snug">
          <span class="font-semibold">{props.entry.author_name} </span>
          <span>{decodeHtmlEntities(props.entry.summary)}</span>
        </p>
        <p class="text-[10px] text-muted mt-0.5">
          {relativeTime(props.entry.created)}
        </p>
      </div>
    </a>
  );
}

// ── NoticesSection ────────────────────────────────────────────────────────────

function NoticesSection(props: {
  open: boolean;
  onOpenModal: (uuid: string) => void;
}) {
  const { t } = useI18n();
  const [entries, { refetch }] = createQueryResource(
    "hq-notices",
    () => (props.open ? true : null),
    fetchNotices,
  );

  return (
    <div class="border border-rim rounded-xl overflow-hidden">
      <div class="px-1 py-1 space-y-0.5 bg-elevated">
        <Show when={entries.loading}>
          <div class="space-y-1 px-2 py-1">
            <For each={[1, 2, 3]}>
              {() => <div class="h-8 rounded bg-surface animate-pulse" />}
            </For>
          </div>
        </Show>
        <Show when={!entries.loading && entries.error}>
          <div class="flex flex-col items-center gap-1 py-3 text-[11px] text-muted">
            <span>{entries.error?.message}</span>
            <button
              onClick={() => refetch()}
              class="text-accent hover:underline"
            >
              {t("hq.retry")}
            </button>
          </div>
        </Show>
        <Show when={!entries.loading && !entries.error}>
          <Show
            when={(entries() ?? []).length > 0}
            fallback={
              <p class="text-[11px] text-muted text-center py-3">
                {t("hq.no_messages")}
              </p>
            }
          >
            <For each={entries()}>
              {(entry) => (
                <NoticeRow entry={entry} onOpen={props.onOpenModal} />
              )}
            </For>
          </Show>
        </Show>
      </div>
      <div class="border-t border-rim py-1.5 text-center bg-surface">
        <a href="/notify" class="text-[11px] text-accent hover:underline">
          {t("hq.view_all")}
        </a>
      </div>
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
  const { t } = useI18n();
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
  const [showNotices, setShowNotices] = createSignal(false);

  const applyRaw = (raw: SseResponse, fromSsePush = false) => {
    const { buckets: incoming, forumKeys: fk } = normalise(raw);
    if (fk.length) setForumKeys(fk);
    const freshNotifs: { key: string; n: HzNotification }[] = [];
    setBuckets((prev) => {
      const next = { ...prev };
      for (const key of DISPLAY_ORDER) {
        const inc = incoming[key];
        if (!inc) continue;
        if (fromSsePush && inc.notifications.length) {
          const prevList = prev[key]?.notifications ?? [];
          const existingMids = new Set(
            prevList.map((n) => n.b64mid).filter(Boolean),
          );
          for (const n of inc.notifications) {
            if (!n.b64mid || !existingMids.has(n.b64mid)) {
              freshNotifs.push({ key, n });
            }
          }
          next[key] = {
            count: inc.count,
            notifications: prependDeduped(prevList, inc.notifications),
          };
        } else {
          next[key] = inc;
        }
      }
      return next;
    });
    if (fromSsePush) {
      for (const { key, n } of freshNotifs) {
        const meta = KNOWN_META[key];
        showDesktopNotification(n.name || meta?.label || "Hubzilla", {
          body: stripHtml(n.message),
          icon: n.photo,
          tag: n.b64mid ?? `${key}-${n.notify_id ?? ""}`,
          onClick: () => {
            const uuid = getDisplayUuid(n);
            if (uuid) setModalUuid(uuid);
            else window.location.assign(toRelativePath(n.notify_link ?? meta?.href));
          },
        });
      }
    }
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

  const markAllRead = async () => {
    const currentBuckets = buckets();
    const promises: Promise<unknown>[] = [];

    // Use server-side markRead for all supported item/event/notify buckets
    for (const key of ["network", "dm", "home", "notify", "all_events", "pubs"] as const) {
      if ((currentBuckets[key]?.count ?? 0) > 0) promises.push(markAllSeen(key));
    }
    // Forums require one call per forum_{id}
    if ((currentBuckets["forums"]?.count ?? 0) > 0) {
      forumKeys().forEach((fk) => promises.push(markAllSeen(fk)));
    }
    // Files have no markRead endpoint — use b64mids from loaded notifications
    const fileMids = (currentBuckets["files"]?.notifications ?? [])
      .map((n) => n.b64mid)
      .filter((m): m is string => !!m);
    if (fileMids.length) {
      promises.push(
        fetch("/sse_bs", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ sse_rmids: fileMids.join(","), nquery: "" }),
        }),
      );
    }

    // Optimistic clear
    setBuckets((prev) => {
      const next = { ...prev };
      for (const key of DISPLAY_ORDER) next[key] = { count: 0, notifications: [] };
      return next;
    });

    try {
      await Promise.all(promises);
      await doFetchCounts();
    } catch {
      /* silent */
    }
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
            {t("ui.notifications_title")}
          </h3>
          <div class="flex items-center gap-1.5">
            <Show when={booted() && auth()?.isLoggedIn}>
              <button
                onClick={() => setShowNotices((v) => !v)}
                title={t("hq.msg_tab_notices")}
                class="p-1 rounded transition-colors"
                classList={{
                  "text-accent bg-accent-muted": showNotices(),
                  "text-subtle hover:text-txt hover:bg-elevated": !showNotices(),
                }}
              >
                <MdOutlineCampaign class="w-4 h-4" />
              </button>
            </Show>
            <Show when={booted() && hasAnyCount()}>
              <button
                onClick={markAllRead}
                title={t("ui.mark_all_read")}
                class="p-1 rounded text-subtle hover:text-txt hover:bg-elevated transition-colors"
              >
                <MdFillDone_all class="w-4 h-4" />
              </button>
            </Show>
            <button
              onClick={manualRefresh}
              disabled={refreshing()}
              title={t("ui.refresh")}
              class="p-1 rounded text-subtle hover:text-txt hover:bg-elevated
                     transition-colors disabled:opacity-40"
            >
              <MdFillRefresh
                class={`w-4 h-4 ${refreshing() ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        <Show when={showNotices()}>
          <NoticesSection open={showNotices()} onOpenModal={setModalUuid} />
        </Show>

        <Show when={!auth.loading && !auth()?.isLoggedIn}>
          <p class="text-xs text-muted text-center py-4">
            {t("ui.sign_in_notifs")}
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
                  onNotifySeen={async (nid) => {
                    await markNotifySeen(nid);
                    try {
                      await doFetchCounts();
                    } catch {
                      /* silent */
                    }
                  }}
                  onClearAll={async (key) => {
                    setBuckets((prev) => ({
                      ...prev,
                      [key]: { count: 0, notifications: [] },
                    }));
                    try {
                      if (key === "forums") {
                        await Promise.all(forumKeys().map((fk) => markAllSeen(fk)));
                      } else {
                        await markAllSeen(key);
                      }
                      await doFetchCounts();
                    } catch {
                      /* silent */
                    }
                  }}
                  onOpenModal={(uuid) => setModalUuid(uuid)}
                />
              )}
            </For>
          </div>
        </Show>

        <Show
          when={
            booted() &&
            auth()?.isLoggedIn &&
            activeBuckets().length === 0 &&
            notices().length === 0
          }
        >
          <p class="flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-subtle">
            <MdFillNotifications class="w-3.5 h-3.5 shrink-0" />
            {t("ui.no_notifications")}
          </p>
        </Show>

      </div>
    </>
  );
}
