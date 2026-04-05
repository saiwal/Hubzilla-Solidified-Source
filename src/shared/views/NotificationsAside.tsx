import { For, Show, type JSX, createSignal } from "solid-js";
import { Portal } from "solid-js/web";
import { useNotifications } from "../lib/useNotifications";
import type { NotificationType } from "../lib/notificationService";
import PostDetailModal from "./PostDetailModal";
import {
  MdFillAlternate_email,
  MdFillCalendar_month,
  MdFillMail,
  MdFillPublic,
  MdFillWaving_hand,
} from "solid-icons/md";

const PANELS: {
  type: NotificationType;
  label: string;
  icon: string | JSX.Element;
  hasFilter: boolean;
}[] = [
  {
    type: "network",
    label: "Network",
    icon: <MdFillPublic size={17} />,
    hasFilter: true,
  },
  {
    type: "dm",
    label: "Direct Messages",
    icon: <MdFillMail size={17} />,
    hasFilter: false,
  },
  {
    type: "home",
    label: "Mentions",
    icon: <MdFillAlternate_email size={17} />,
    hasFilter: false,
  },
  {
    type: "intros",
    label: "Friend Requests",
    icon: <MdFillWaving_hand size={17} />,
    hasFilter: false,
  },
  {
    type: "files",
    label: "System / Files",
    icon: <MdFillCalendar_month size={17} />,
    hasFilter: false,
  },
		{
    type: "pubs",
    label: "Public Stream",
    icon: <MdFillCalendar_month size={17} />,
    hasFilter: false,
  },
{
    type: "notify",
    label: "Notices",
    icon: <MdFillCalendar_month size={17} />,
    hasFilter: false,
  },


];

function extractDisplayUuid(url: string): string | null {
  const match = url.match(/\/display\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

// ── Notification item — extracted to avoid JSX/block-body parse failure ───────

interface NotificationItemProps {
  item: {
    notify_link: string;
    notify_id: string;
    photo: string;
    name: string;
    when: string;
    message: string;
    unseen: boolean;
    thread_top?: boolean;
  };
  hasFilter: boolean;
  onMark: () => void;
  onOpenPost: (uuid: string) => void;
}

function NotificationItem(props: NotificationItemProps): JSX.Element {
  const uuid = extractDisplayUuid(props.item.notify_link);

  const handleClick = (e: MouseEvent) => {
    props.onMark();
    if (uuid) {
      e.preventDefault();
      props.onOpenPost(uuid);
    }
  };

  return (
    <a
      href={props.item.notify_link}
      onClick={handleClick}
      class={`flex items-start gap-2.5 px-3 py-2.5 text-sm
              hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
              ${props.item.unseen ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
    >
      <img
        src={props.item.photo}
        alt={props.item.name}
        class="w-8 h-8 rounded-full shrink-0 mt-0.5 object-cover"
      />
      <div class="min-w-0 flex-1">
        <div class="flex justify-between gap-1">
          <span class="font-medium truncate">{props.item.name}</span>
          <span class="text-xs text-gray-400 shrink-0 tabular-nums">
            {new Date(props.item.when).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p class="text-gray-500 dark:text-gray-400 truncate text-xs">
          {props.item.message}
        </p>
        <Show when={props.hasFilter && !props.item.thread_top}>
          <span class="text-xs text-gray-400 italic">↩ reply</span>
        </Show>
      </div>
      <Show when={props.item.unseen}>
        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
      </Show>
    </a>
  );
}
// ── Panel ─────────────────────────────────────────────────────────────────────

interface PanelProps {
  type: NotificationType;
  label: string;
  icon: string | JSX.Element;
  hasFilter: boolean;
  store: ReturnType<typeof useNotifications>["store"];
  togglePanel: (t: NotificationType) => void;
  toggleThreadTop: (t: NotificationType) => void;
  handleScroll: (t: NotificationType, el: HTMLElement) => void;
  markRead: (t: NotificationType, id: string) => void;
  formatCount: (n: number) => string;
  onOpenPost: (uuid: string) => void;
}

function NotificationPanel(props: PanelProps) {
  const panel = () => props.store[props.type];

  const visibleItems = () =>
    props.hasFilter && panel().threadTopOnly
      ? panel().items.filter((i) => i.thread_top)
      : panel().items;

  const onScroll = (e: Event) =>
    props.handleScroll(props.type, e.currentTarget as HTMLElement);

  return (
    <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => props.togglePanel(props.type)}
        class="w-full flex items-center justify-between px-3 py-2.5
               bg-gray-50 dark:bg-gray-700/60 hover:bg-gray-100
               dark:hover:bg-gray-700 transition-colors text-sm font-medium"
      >
        <span class="flex items-center gap-2">
          <span>{props.icon}</span>
          <span>{props.label}</span>
        </span>
        <span class="flex items-center gap-2">
          <Show when={panel().count > 0}>
            <span
              class="bg-indigo-500 text-white text-xs font-bold
                         px-1.5 py-0.5 rounded-full leading-none"
            >
              {props.formatCount(panel().count)}
            </span>
          </Show>
          <svg
            class={`w-3.5 h-3.5 transition-transform duration-200 ${panel().open ? "rotate-180" : ""}`}
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

      <Show when={panel().open}>
        <div class="flex flex-col">
          <Show when={props.hasFilter}>
            <button
              onClick={() => props.toggleThreadTop(props.type)}
              class={`flex items-center gap-2 px-3 py-2 text-xs border-b
                      border-gray-100 dark:border-gray-700 transition-colors
                      ${
                        panel().threadTopOnly
                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium"
                          : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      }`}
            >
              <svg
                class="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                />
              </svg>
              Top-level posts only
              <Show when={panel().threadTopOnly}>
                <span class="ml-auto text-indigo-500">✓</span>
              </Show>
            </button>
          </Show>

          <div
            onScroll={onScroll}
            class="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700"
          >
            <Show when={visibleItems().length === 0 && !panel().loading}>
              <p class="text-xs text-gray-400 text-center py-6">
                No notifications
              </p>
            </Show>

            <For each={visibleItems()}>
              {(item) => (
                <NotificationItem
                  item={item}
                  hasFilter={props.hasFilter}
                  onMark={() => props.markRead(props.type, item.notify_id)}
                  onOpenPost={props.onOpenPost}
                />
              )}
            </For>

            <Show when={panel().loading}>
              <div class="flex justify-center py-3">
                <span class="text-xs text-gray-400 animate-pulse">
                  Loading…
                </span>
              </div>
            </Show>

            <Show when={!panel().hasMore && panel().items.length > 0}>
              <p class="text-xs text-gray-400 text-center py-2">
                All caught up ✓
              </p>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NotificationsAside() {
  const {
    store,
    toasts,
    togglePanel,
    toggleThreadTop,
    handleScroll,
    markRead,
    formatCount,
  } = useNotifications();

  const [activeUuid, setActiveUuid] = createSignal<string | null>(null);
  const visiblePanels = () =>
    PANELS.filter((p) => {
      const panel = store[p.type];
      return panel.count > 0 || panel.loading;
    });

  const hasAnyPanels = () => visiblePanels().length > 0;
  return (
    <div class="flex flex-col ">
      <h2 class="text-lg font-bold mb-4 px-1">Notifications</h2>
      <div class="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        <For each={toasts}>
          {(t) => (
            <div
              class={`px-4 py-2 rounded-lg text-sm text-white shadow-lg ${
                t.variant === "danger" ? "bg-red-500" : "bg-blue-500"
              }`}
            >
              {t.msg}
            </div>
          )}
        </For>
      </div>
      <div class="flex-1 overflow-y-auto space-y-1">
        <Show
          when={hasAnyPanels()}
          fallback={
            <div class="flex flex-col items-center justify-center py-3 text-center">
              <p class="text-sm text-gray-400">No notifications</p>
            </div>
          }
        >
          <For each={visiblePanels()}>
            {(p) => (
              <NotificationPanel
                type={p.type}
                label={p.label}
                icon={p.icon}
                hasFilter={p.hasFilter}
                store={store}
                togglePanel={togglePanel}
                toggleThreadTop={toggleThreadTop}
                handleScroll={handleScroll}
                markRead={markRead}
                formatCount={formatCount}
                onOpenPost={setActiveUuid}
              />
            )}
          </For>
        </Show>
      </div>
      <Show when={activeUuid()}>
        <Portal>
          <PostDetailModal
            uuid={activeUuid()!}
            onClose={() => setActiveUuid(null)}
          />
        </Portal>
      </Show>{" "}
    </div>
  );
}
