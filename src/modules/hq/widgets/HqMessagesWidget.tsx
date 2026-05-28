import PostDetailModal from '@/shared/views/PostDetailModal';
import { markItemSeen } from '@/shared/lib/markSeen';
import {
  createSignal,
  createEffect,
  onCleanup,
  For,
  Show,
  type Component,
} from "solid-js";

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

type MessageType = "" | "direct" | "starred" | "notification";

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
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
  type: MessageType;
  author: string;
  file: string;
  signal?: AbortSignal;
}): Promise<HqResponse> {
  const body = new URLSearchParams({
    offset: String(params.offset),
    type: params.type,
    author: params.author,
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

// ── Tab config ───────────────────────────────────────────────────────────────

const TABS: { type: MessageType; label: string; path: string }[] = [
  {
    type: "",
    label: "All",
    path: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z",
  },
  {
    type: "direct",
    label: "Direct",
    path: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    type: "starred",
    label: "Starred",
    path: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.381-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
  },
  {
    type: "notification",
    label: "Notices",
    path: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
];

// ── Avatar ─────────────────────────────────────────────────────────────────

const Avatar: Component<{ src?: string; name: string; size?: string }> = (props) => {
  const hue = () => avatarHue(props.name);
  const size = props.size ?? "w-9 h-9";
  return (
    <div
      class={`${size} rounded-full shrink-0 flex items-center justify-center text-xs font-semibold overflow-hidden select-none`}
      style={{
        background: props.src
          ? undefined
          : `hsl(${hue()}, 55%, 82%)`,
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

// ── Message item ───────────────────────────────────────────────────────────

const MessageItem: Component<{ entry: MessageEntry }> = (props) => {
  const e = props.entry;
  const [showModal, setShowModal] = createSignal(false);
  const [locallyRead, setLocallyRead] = createSignal(false);
  const isUnseen = () => !locallyRead() && e.unseen_count > 0;

  function handleClick() {
    setShowModal(true);
    if (e.unseen_count > 0 && !locallyRead()) {
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
          w-full text-left px-4 py-3 flex items-start gap-3
          transition-all duration-150 relative
          hover:bg-overlay
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent
          ${isUnseen() ? "bg-accent-muted" : ""}
        `}
      >
        <Show when={isUnseen()}>
          <span class="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-accent" />
        </Show>

        <Avatar src={e.author_img} name={e.author_name} />

        <div class="flex-1 min-w-0">
          <div class="flex items-baseline justify-between gap-2 mb-0.5">
            <span
              class={`text-sm truncate leading-snug ${
                isUnseen()
                  ? "font-semibold text-txt"
                  : "font-medium text-txt"
              }`}
            >
              {e.author_name}
            </span>
            <time class="text-[11px] text-muted shrink-0 tabular-nums">
              {timeAgo(e.created)}
            </time>
          </div>

          <p class="text-[13px] text-muted line-clamp-2 leading-relaxed">
            {e.summary}
          </p>

          <Show when={e.info}>
            <p class="text-[11px] text-muted mt-1 truncate">
              {e.info}
            </p>
          </Show>
        </div>

        <Show when={isUnseen()}>
          <span
            class="shrink-0 self-center min-w-[1.25rem] h-5 rounded-full text-[10px] font-bold
              flex items-center justify-center px-1.5 tabular-nums
              bg-accent-muted text-accent"
          >
            {e.unseen_count}
          </span>
        </Show>
      </button>

      <div class="mx-4 h-px bg-rim" />

      <Show when={showModal()}>
        <PostDetailModal uuid={e.b64mid} onClose={() => setShowModal(false)} />
      </Show>
    </>
  );
};

// ── Skeleton loader ──────────────────────────────────────────────────────────

const SkeletonRow: Component = () => (
  <div class="px-4 py-3 flex items-start gap-3 animate-pulse">
    <div class="w-9 h-9 rounded-full bg-overlay shrink-0" />
    <div class="flex-1 space-y-2">
      <div class="h-3 bg-overlay rounded w-2/5" />
      <div class="h-3 bg-overlay rounded w-4/5" />
      <div class="h-3 bg-overlay rounded w-3/5" />
    </div>
  </div>
);

// ── Main widget ───────────────────────────────────────────────────────────────

export default function HqMessagesWidget() {
  const [activeTab, setActiveTab] = createSignal<MessageType>("");
  const [refreshKey, setRefreshKey] = createSignal(0);
  const [entries, setEntries] = createSignal<MessageEntry[]>([]);
  const [offset, setOffset] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [empty, setEmpty] = createSignal(false);
  const [authorFilter, setAuthorFilter] = createSignal("");

  let scrollRef: HTMLDivElement | undefined;
  let resetController: AbortController | null = null;
  let loadMoreActive = false;

  async function loadPage(reset = false) {
    if (!reset && loadMoreActive) return;

    let signal: AbortSignal | undefined;

    if (reset) {
      // Cancel any in-flight reset request and start fresh
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
      const data = await fetchMessages({
        offset: currentOffset,
        type: activeTab(),
        author: authorFilter(),
        file: "",
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
      // Only update loading state if this request wasn't superseded
      if (!signal?.aborted) {
        setLoading(false);
        if (!reset) loadMoreActive = false;
      }
    }
  }

  createEffect(() => {
    activeTab();
    authorFilter();
    refreshKey();
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

  function handleTabClick(type: MessageType) {
    if (activeTab() === type) {
      // Re-clicking the active tab forces a refresh
      setRefreshKey((k) => k + 1);
    } else {
      setActiveTab(type);
    }
  }

  return (
    <div
      class="bg-surface rounded-2xl border border-rim
             flex flex-col overflow-hidden shadow-sm"
      style={{ height: "480px" }}
    >
      {/* ── Header ── */}
      <div class="px-4 pt-4 pb-0 shrink-0">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-txt tracking-tight">
            Messages
          </h3>
          {/* Search input */}
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
              placeholder="Filter…"
              class="w-36 text-xs bg-overlay border-0 rounded-lg
                     pl-7 pr-3 py-1.5 text-txt
                     placeholder-muted
                     focus:outline-none focus:ring-2 focus:ring-accent/40
                     transition-all duration-200 focus:w-44"
              onInput={(e) => onFilterInput(e.currentTarget.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div class="flex gap-1" role="tablist">
          <For each={TABS}>
            {(tab) => {
              const isActive = () => activeTab() === tab.type;
              return (
                <button
                  role="tab"
                  aria-selected={isActive()}
                  type="button"
                  class={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-150 select-none
                    ${
                      isActive()
                        ? "bg-txt text-surface"
                        : "text-muted hover:bg-overlay hover:text-txt"
                    }
                  `}
                  onClick={() => handleTabClick(tab.type)}
                >
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.path} />
                  </svg>
                  <span class="hidden sm:inline">{tab.label}</span>
                </button>
              );
            }}
          </For>
        </div>

        {/* Tab underline */}
        <div class="mt-3 h-px bg-rim" />
      </div>

      {/* ── Scrollable list ── */}
      <div ref={scrollRef} class="flex-1 overflow-y-auto" onScroll={onScroll}>

        <Show when={error()}>
          <div class="flex flex-col items-center justify-center py-10 gap-2 text-sm">
            <span class="text-2xl">⚠</span>
            <span class="text-accent">{error()}</span>
            <button
              onClick={() => loadPage(true)}
              class="text-xs text-accent hover:underline mt-1"
            >
              Retry
            </button>
          </div>
        </Show>

        <Show when={empty() && !loading()}>
          <div class="flex flex-col items-center justify-center h-full gap-2 text-sm text-muted py-16">
            <svg class="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            <span>Nothing here</span>
          </div>
        </Show>

        <Show when={loading() && entries().length === 0}>
          <For each={Array(5)}>{() => <SkeletonRow />}</For>
        </Show>

        <For each={entries()}>
          {(entry) => <MessageItem entry={entry} />}
        </For>

        <Show when={loading() && entries().length > 0}>
          <div class="flex items-center justify-center gap-2 py-4 text-xs text-muted">
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading
          </div>
        </Show>
      </div>
    </div>
  );
}
