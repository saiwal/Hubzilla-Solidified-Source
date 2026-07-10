import PostDetailModal from '@/shared/views/PostDetailModal';
import { markItemSeen } from '@/shared/lib/markSeen';
import { useI18n } from "@/i18n";
import { fetchFolders } from "@/modules/network/api";
import { MdOutlineWarning } from "solid-icons/md";
import {
  createSignal,
  createEffect,
  createMemo,
  onCleanup,
  For,
  Show,
  type Component,
} from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";

// ── Types ─────────────────────────────────────────────────────────────────

interface MessageEntry {
  b64mid: string;
  created: string;
  summary: string;
  info: string;
  author_name: string;
  author_addr: string;
  href: string;
  icon: string;
  unseen_count: number;
  unseen_class: string;
  author_img: string;
}

interface HqResponse {
  offset: number;
  entries: MessageEntry[];
}

export type MessageType = "" | "direct" | "starred" | "notification";
export type FeedType = MessageType | "folder";

// ── Time grouping ──────────────────────────────────────────────────────────

const TIME_GROUPS = ["Just now", "Today", "Yesterday", "This week", "Older"] as const;
type TimeGroup = (typeof TIME_GROUPS)[number];

function getTimeGroup(dateStr: string): TimeGroup {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 300) return "Just now";
  if (diff < 86400) return "Today";
  if (diff < 172800) return "Yesterday";
  if (diff < 604800) return "This week";
  return "Older";
}

// ── Type color rail ────────────────────────────────────────────────────────

// Infer per-entry type from the feed's fixed type; fall back to icon string
// hints for the combined "All" feed.
function inferEntryType(entry: MessageEntry, feedType: FeedType): MessageType {
  if (feedType !== "" && feedType !== "folder") return feedType;
  const icon = entry.icon?.toLowerCase() ?? "";
  if (icon.includes("mail") || icon.includes("envelope") || icon.includes("direct")) return "direct";
  if (icon.includes("star")) return "starred";
  if (icon.includes("bell") || icon.includes("notif")) return "notification";
  return "";
}

const TYPE_RAIL: Record<MessageType, string> = {
  "":             "hsl(220 10% 55%)",  // neutral gray
  "direct":       "#3b82f6",           // blue-500
  "starred":      "#f59e0b",           // amber-500
  "notification": "#8b5cf6",           // violet-500
};

const TYPE_ICON_PATH: Record<MessageType, string> = {
  "":
    "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z",
  "direct":
    "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  "starred":
    "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.381-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  "notification":
    "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
};

const FOLDER_ICON_PATH =
  "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z";

// One card per feed type — id/label/icon used by the concrete widget wrappers.
export const FEED_META: Record<FeedType, { titleKey: string }> = {
  "":             { titleKey: "hq.messages" },
  "direct":       { titleKey: "hq.msg_tab_direct" },
  "starred":      { titleKey: "hq.msg_tab_starred" },
  "notification": { titleKey: "hq.msg_tab_notices" },
  "folder":       { titleKey: "hq.msg_tab_folders" },
};

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function decodeHtmlEntities(str: string): string {
  const ta = document.createElement("textarea");
  ta.innerHTML = str;
  return ta.value;
}

function parseFolderNames(html: string): string[] {
  const div = document.createElement("div");
  div.innerHTML = html;
  const spans = div.querySelectorAll("span");
  if (spans.length > 0) {
    return Array.from(spans)
      .map((s) => s.textContent?.trim() ?? "")
      .filter(Boolean);
  }
  const text = (div.textContent ?? div.innerText ?? "").trim();
  return text ? [text] : [];
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function avatarHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffff;
  return h % 360;
}

async function fetchMessages(params: {
  offset: number;
  type: MessageType | "filed";
  file: string;
  signal?: AbortSignal;
}): Promise<HqResponse> {
  const body = new URLSearchParams({
    offset: String(params.offset),
    type: params.type,
    file: params.file,
  });
  const res = await fetch("/hq", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
    signal: params.signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Avatar ────────────────────────────────────────────────────────────────

const Avatar: Component<{ src?: string; name: string; size?: string }> = (props) => {
  const hue = () => avatarHue(props.name);
  const size = props.size ?? "w-8 h-8";
  return (
    <div
      class={`${size} rounded-full shrink-0 flex items-center justify-center text-xs font-semibold overflow-hidden select-none`}
      style={{
        background: props.src ? undefined : `hsl(${hue()}, 55%, 82%)`,
        color: `hsl(${hue()}, 45%, 35%)`,
      }}
    >
      <Show when={props.src} fallback={<span>{initials(props.name)}</span>}>
        <img
          src={props.src}
          alt={props.name}
          class="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </Show>
    </div>
  );
};

// ── Message item ──────────────────────────────────────────────────────────

const MessageItem: Component<{ entry: MessageEntry; feedType: FeedType }> = (props) => {
  const e = props.entry;
  const [showModal, setShowModal] = createSignal(false);
  const [locallyRead, setLocallyRead] = createSignal(false);

  const isNewPost = () => !locallyRead() && e.unseen_class === "primary";
  const hasUnseenReplies = () => !locallyRead() && e.unseen_count > 0;
  const isAnyUnseen = () => isNewPost() || hasUnseenReplies();

  const entryType = () => inferEntryType(e, props.feedType);
  const railColor = () => TYPE_RAIL[entryType()];
  const iconPath = () => TYPE_ICON_PATH[entryType()];

  function handleClick() {
    setShowModal(true);
    if (!locallyRead() && (e.unseen_class === "primary" || e.unseen_count > 0)) {
      setLocallyRead(true);
      markItemSeen(e.b64mid);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        class={`
          w-full text-left px-3.5 py-2 flex items-start gap-2
          transition-all duration-150 relative
          hover:bg-overlay
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent
          ${isAnyUnseen() ? "bg-accent-muted" : ""}
        `}
      >
        {/* Type color rail — always shown, full opacity when unseen */}
        <span
          class="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full transition-opacity duration-200"
          style={{
            background: railColor(),
            opacity: isAnyUnseen() ? "1" : "0.3",
          }}
        />

        <Avatar src={e.author_img} name={e.author_name} size="w-7 h-7" />

        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-2">
            <div class="flex items-center gap-1 min-w-0">
              {/* Tiny type icon colored by rail */}
              <svg
                class="w-2.5 h-2.5 shrink-0 opacity-70"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: railColor() }}
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d={iconPath()}
                />
              </svg>
              <span
                class={`text-[13px] truncate leading-snug ${
                  isAnyUnseen() ? "font-semibold text-txt" : "font-medium text-txt"
                }`}
              >
                {e.author_name}
              </span>
            </div>
            <time class="text-[10px] text-muted shrink-0 tabular-nums">
              {timeAgo(e.created)}
            </time>
          </div>

          <p class="text-xs text-muted line-clamp-1 leading-snug">
            {decodeHtmlEntities(e.summary)}
          </p>

          <Show when={e.info}>
            <div class="flex flex-wrap gap-1 mt-0.5">
              <For each={parseFolderNames(e.info)}>
                {(name) => (
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-overlay text-[10px] text-muted font-medium">
                    <svg class="w-2.5 h-2.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d={FOLDER_ICON_PATH} />
                    </svg>
                    <span class="truncate max-w-[80px]">{name}</span>
                  </span>
                )}
              </For>
            </div>
          </Show>
        </div>

        <Show when={hasUnseenReplies()}>
          <span
            class="absolute bottom-1.5 right-2.5 min-w-[1.1rem] h-4 rounded-full text-[9px] font-bold
              flex items-center justify-center px-1 tabular-nums
              bg-accent text-surface"
          >
            {e.unseen_count}
          </span>
        </Show>
      </button>

      <div class="mx-3.5 h-px bg-rim" />

      <Show when={showModal()}>
        <PostDetailModal uuid={e.b64mid} onClose={() => setShowModal(false)} />
      </Show>
    </>
  );
};

// ── Skeleton loader ───────────────────────────────────────────────────────

const SkeletonRow: Component = () => (
  <div class="px-3.5 py-2 flex items-start gap-2 animate-pulse">
    <div class="w-7 h-7 rounded-full bg-overlay shrink-0" />
    <div class="flex-1 space-y-1.5">
      <div class="h-2.5 bg-overlay rounded w-2/5" />
      <div class="h-2.5 bg-overlay rounded w-4/5" />
    </div>
  </div>
);

// ── Group header ──────────────────────────────────────────────────────────

const GroupHeader: Component<{ label: string; count: number }> = (props) => (
  <div class="sticky top-0 z-10 bg-surface px-3.5 py-1 flex items-center gap-2 border-b border-rim">
    <span class="text-[10px] font-semibold uppercase tracking-widest text-muted">
      {props.label}
    </span>
    <div class="flex-1 h-px bg-rim" />
    <span class="text-[10px] text-muted tabular-nums">{props.count}</span>
  </div>
);

// ── Main feed ─────────────────────────────────────────────────────────────

// Shared list/fetch/render logic for a single message tab. Each concrete
// hq.messages.* widget is a thin wrapper that fixes `type`; see
// HqMessagesWidget.tsx, HqDirectMessagesWidget.tsx, HqStarredMessagesWidget.tsx,
// HqNoticesWidget.tsx and HqFoldersWidget.tsx.
export const MessageFeed: Component<{ type: FeedType }> = (props) => {
  const { t } = useI18n();
  const [activeFolder, setActiveFolder] = createSignal("");
  const [folders] = createQueryResource(
    "hq-folders",
    () => (props.type === "folder" ? true : null),
    () => fetchFolders(),
  );
  const [entries, setEntries] = createSignal<MessageEntry[]>([]);
  const [offset, setOffset] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [empty, setEmpty] = createSignal(false);
  const [authorFilter, setAuthorFilter] = createSignal("");

  let scrollRef: HTMLDivElement | undefined;
  let resetController: AbortController | null = null;
  let loadMoreActive = false;

  // The server's `author` param is an exact xchan-hash match, not a text
  // search (see Zotlabs/Widget/Messages.php::get_messages_page) — so
  // filtering is done client-side over whatever's currently loaded.
  const filteredEntries = createMemo(() => {
    const q = authorFilter().trim().toLowerCase();
    if (!q) return entries();
    return entries().filter(
      (e) =>
        e.author_name.toLowerCase().includes(q) ||
        e.author_addr.toLowerCase().includes(q),
    );
  });

  // Group entries by time band in stable order
  const groupedEntries = createMemo(() => {
    const buckets: Partial<Record<TimeGroup, MessageEntry[]>> = {};
    for (const entry of filteredEntries()) {
      const g = getTimeGroup(entry.created);
      (buckets[g] ??= []).push(entry);
    }
    return TIME_GROUPS
      .filter((g) => buckets[g]?.length)
      .map((g) => ({ label: g, items: buckets[g]! }));
  });

  async function loadPage(reset = false) {
    if (!reset && loadMoreActive) return;

    let signal: AbortSignal | undefined;

    if (reset) {
      resetController?.abort();
      const ctrl = new AbortController();
      resetController = ctrl;
      signal = ctrl.signal;
      loadMoreActive = false;
      setEmpty(false);
    } else {
      const cur = offset();
      if (cur === -1) return;
      loadMoreActive = true;
    }

    const currentOffset = reset ? 0 : offset();
    setLoading(true);

    try {
      const feedType = props.type;
      const data = await fetchMessages({
        offset: currentOffset,
        type: feedType === "folder" ? "filed" : feedType,
        file: feedType === "folder" ? activeFolder() : "",
        signal,
      });

      if (reset) {
        setEntries(data.entries);
      } else {
        setEntries((prev) => [...prev, ...data.entries]);
      }

      setOffset(data.offset);
      setEmpty(reset && data.entries.length === 0);
      setError(null);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        if (!reset) loadMoreActive = false;
      }
    }
  }

  createEffect(() => {
    activeFolder();
    setOffset(0);
    loadPage(true);
  });

  function onScroll() {
    const el = scrollRef;
    if (!el) return;
    if (el.scrollTop > el.scrollHeight - el.clientHeight - el.scrollHeight / 7) {
      loadPage();
    }
  }

  let filterTimer: ReturnType<typeof setTimeout>;
  function onFilterInput(val: string) {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => setAuthorFilter(val), 300);
  }
  onCleanup(() => {
    clearTimeout(filterTimer);
    resetController?.abort();
  });

  function selectFolder(name: string) {
    setActiveFolder(name);
  }

  return (
    <div
      class="bg-surface rounded-2xl border border-rim flex flex-col overflow-hidden shadow-sm"
      style={{ height: "480px" }}
    >
      {/* ── Header ── */}
      <div class="px-3.5 pt-3.5 pb-2 shrink-0">
        <div class="flex items-center justify-between mb-2.5">
          <span class="text-xs font-medium uppercase tracking-wider text-muted">
            {t(FEED_META[props.type].titleKey as "hq.msg_tab_all")}
          </span>
          <div class="relative">
            <svg
              class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder={t("hq.filter_placeholder")}
              class="w-32 text-xs bg-overlay border-0 rounded-lg
                     pl-7 pr-3 py-1 text-txt placeholder-muted
                     focus:outline-none focus:ring-2 focus:ring-accent/40
                     transition-all duration-200 focus:w-40"
              onInput={(e) => onFilterInput(e.currentTarget.value)}
            />
          </div>
        </div>

        {/* Folder picker — only shown for the folders feed */}
        <Show when={props.type === "folder"}>
          <div class="pt-2 pb-1">
            <Show
              when={!folders.loading}
              fallback={
                <div class="flex gap-1.5 flex-wrap px-1">
                  <For each={Array(3)}>
                    {() => <div class="h-6 w-16 rounded-lg bg-overlay animate-pulse" />}
                  </For>
                </div>
              }
            >
              <Show
                when={(folders() ?? []).length > 0}
                fallback={
                  <p class="text-xs text-muted px-1 py-1">{t("hq.no_folders")}</p>
                }
              >
                <div class="flex gap-1.5 flex-wrap">
                  <For each={folders() ?? []}>
                    {(folder) => (
                      <button
                        type="button"
                        onClick={() => selectFolder(folder)}
                        class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                               transition-colors select-none"
                        classList={{
                          "bg-txt text-surface font-medium": activeFolder() === folder,
                          "bg-overlay text-muted hover:bg-overlay hover:text-txt": activeFolder() !== folder,
                        }}
                      >
                        <svg class="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d={FOLDER_ICON_PATH} />
                        </svg>
                        <span class="truncate max-w-[100px]">{folder}</span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
          <div class="h-px bg-rim" />
        </Show>
      </div>

      {/* ── Scrollable list ── */}
      <div ref={scrollRef} class="flex-1 overflow-y-auto" onScroll={onScroll}>

        <Show when={error()}>
          <div class="flex flex-col items-center justify-center py-10 gap-2 text-sm">
            <MdOutlineWarning class="text-2xl text-muted" />
            <span class="text-accent">{error()}</span>
            <button
              onClick={() => loadPage(true)}
              class="text-xs text-accent hover:underline mt-1"
            >
              {t("hq.retry")}
            </button>
          </div>
        </Show>

        <Show when={empty() && !loading()}>
          <div class="flex flex-col items-center justify-center h-full gap-2 text-sm text-muted py-16">
            <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"
              />
            </svg>
            <span>{t("hq.no_messages")}</span>
          </div>
        </Show>

        <Show when={!empty() && !loading() && entries().length > 0 && filteredEntries().length === 0}>
          <div class="flex flex-col items-center justify-center h-full gap-2 text-sm text-muted py-16">
            <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <span>{t("hq.no_filter_matches")}</span>
          </div>
        </Show>

        <Show when={loading() && entries().length === 0}>
          <For each={Array(5)}>{() => <SkeletonRow />}</For>
        </Show>

        {/* Grouped timeline */}
        <For each={groupedEntries()}>
          {(group) => (
            <>
              <GroupHeader label={group.label} count={group.items.length} />
              <For each={group.items}>
                {(entry) => <MessageItem entry={entry} feedType={props.type} />}
              </For>
            </>
          )}
        </For>

        <Show when={loading() && entries().length > 0}>
          <div class="flex items-center justify-center gap-2 py-4 text-xs text-muted">
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {t("hq.loading")}
          </div>
        </Show>
      </div>
    </div>
  );
};
