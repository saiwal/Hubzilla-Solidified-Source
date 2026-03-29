import PostDetailModal from '../../../shared/ui/PostDetailModal';
import {
  createSignal,
  createEffect,
  onCleanup,
  For,
  Show,
  type Component,
} from "solid-js";

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

async function fetchMessages(params: {
  offset: number;
  type: MessageType;
  author: string;
  file: string;
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
      "Accept": "application/json",
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Tab config ───────────────────────────────────────────────────────────────

const TABS: { type: MessageType; label: string; icon: string }[] = [
  { type: "",             label: "All",           icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { type: "direct",      label: "Direct",        icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
  { type: "starred",     label: "Starred",       icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  { type: "notification", label: "Notices",      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
];

// ── Message item ─────────────────────────────────────────────────────────────

const MessageItem: Component<{ entry: MessageEntry }> = (props) => {
  const e = props.entry;
  const [showModal, setShowModal] = createSignal(false);
  return (
    <div
      onclick={() => setShowModal(true)}
      class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700/60 transition-colors relative group cursor-pointer"
    >
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
          {e.author_name}
        </span>
        <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
          {timeAgo(e.created)}
        </span>
      </div>
      <div class="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
        {e.summary}
      </div>
      <Show when={e.info}>
        <div class="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
          {e.info}
        </div>
      </Show>
      <Show when={e.unseen_count > 0}>
        <span class={`absolute bottom-3 right-3 text-xs font-medium px-1.5 py-0.5 rounded-full border
          ${e.unseen_class === "danger"
            ? "border-red-400 text-red-500 dark:text-red-400"
            : "border-blue-400 text-blue-500 dark:text-blue-400"
          }`}>
          {e.unseen_count}
        </span>
      </Show>
      <Show when={showModal()}>
        <PostDetailModal uuid={e.b64mid} onClose={() => setShowModal(false)} />
      </Show>
    </div>
  );
};
// ── Main widget ──────────────────────────────────────────────────────────────

export default function HqMessagesWidget() {
  const [activeTab, setActiveTab] = createSignal<MessageType>("");
  const [entries, setEntries] = createSignal<MessageEntry[]>([]);
  const [offset, setOffset] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [empty, setEmpty] = createSignal(false);
  const [authorFilter, setAuthorFilter] = createSignal("");

  let scrollRef: HTMLDivElement | undefined;
  let fetchActive = false;

  async function loadPage(reset = false) {
    if (fetchActive) return;
    const currentOffset = reset ? 0 : offset();
    if (currentOffset === -1) return;

    fetchActive = true;
    setLoading(true);
    if (reset) setEmpty(false);

    try {
      const data = await fetchMessages({
        offset: currentOffset,
        type: activeTab(),
        author: authorFilter(),
        file: "",
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
      setError(e instanceof Error ? e.message : "failed to load");
    } finally {
      setLoading(false);
      fetchActive = false;
    }
  }

  // Reset and reload when tab or filter changes
  createEffect(() => {
    activeTab();
    authorFilter();
    setOffset(0);
    loadPage(true);
  });

  // Infinite scroll
  function onScroll() {
    const el = scrollRef;
    if (!el) return;
    if (el.scrollTop > el.scrollHeight - el.clientHeight - el.scrollHeight / 7) {
      loadPage();
    }
  }

  // Debounce author filter input
  let filterTimer: ReturnType<typeof setTimeout>;
  function onFilterInput(val: string) {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(() => setAuthorFilter(val), 300);
  }
  onCleanup(() => clearTimeout(filterTimer));

  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden col-span-1 sm:col-span-3" style={{ height: "480px" }}>

      {/* Tabs */}
      <div class="flex border-b border-gray-200 dark:border-gray-700 shrink-0">
        <For each={TABS}>
          {(tab) => (
            <button
              class={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors
                ${activeTab() === tab.type
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
              onClick={() => setActiveTab(tab.type)}
              title={tab.label}
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.icon} />
              </svg>
            </button>
          )}
        </For>
      </div>

      {/* Filter */}
      <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
        <input
          type="text"
          placeholder="Filter by author…"
          class="w-full text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5
                 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500
                 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onInput={(e) => onFilterInput(e.currentTarget.value)}
        />
      </div>

      {/* Scrollable list */}
      <div
        ref={scrollRef}
        class="flex-1 overflow-y-auto"
        onScroll={onScroll}
      >
        <Show when={error()}>
          <div class="p-4 text-sm text-red-400 text-center">⚠ {error()}</div>
        </Show>

        <Show when={empty() && !loading()}>
          <div class="p-6 text-sm text-gray-400 dark:text-gray-500 text-center">
            No messages
          </div>
        </Show>

        <For each={entries()}>
          {(entry) => <MessageItem entry={entry} />}
        </For>

        <Show when={loading()}>
          <div class="flex items-center justify-center gap-2 py-4 text-sm text-gray-400 dark:text-gray-500">
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading…
          </div>
        </Show>
      </div>
    </div>
  );
}
