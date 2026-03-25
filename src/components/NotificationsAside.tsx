import { For, Show } from "solid-js";
import { useNotifications } from "./useNotifications";
import type { NotificationType } from "./notificationService";

const PANELS: { type: NotificationType; label: string; icon: string }[] = [
  { type: "dm",     label: "Direct Messages", icon: "💬" },
  { type: "home",   label: "Mentions",        icon: "🏠" },
  { type: "intros", label: "Friend Requests", icon: "👋" },
  { type: "files",  label: "System / Files",  icon: "🗂️" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface PanelProps {
  type: NotificationType;
  label: string;
  icon: string;
  store: ReturnType<typeof useNotifications>["store"];
  togglePanel: (t: NotificationType) => void;
  handleScroll: (t: NotificationType, el: HTMLElement) => void;
  markRead: (t: NotificationType, id: string) => void;
  formatCount: (n: number) => string;
}

// ── Sub-component (avoids nested For closures sharing `type`) ─────────────────

function NotificationPanel(props: PanelProps) {
  const panel = () => props.store[props.type];

  const onScroll = (e: Event) =>
    props.handleScroll(props.type, e.currentTarget as HTMLElement);

  return (
    <div class="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">

      {/* Header / toggle */}
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
            <span class="bg-indigo-500 text-white text-xs font-bold
                         px-1.5 py-0.5 rounded-full leading-none">
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

      {/* Collapsible body */}
      <Show when={panel().open}>
        <div
          onScroll={onScroll}
          class="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700"
        >
          <Show when={panel().items.length === 0 && !panel().loading}>
            <p class="text-xs text-gray-400 text-center py-6">No notifications</p>
          </Show>

          <For each={panel().items}>
            {(item) => (
              <a
                href={item.notify_link}
                onClick={() => props.markRead(props.type, item.notify_id)}
                class={`flex items-start gap-2.5 px-3 py-2.5 text-sm
                        hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors
                        ${item.unseen ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
              >
                <img
                  src={item.photo}
                  alt={item.name}
                  class="w-8 h-8 rounded-full shrink-0 mt-0.5 object-cover"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex justify-between gap-1">
                    <span class="font-medium truncate">{item.name}</span>
                    <span class="text-xs text-gray-400 shrink-0 tabular-nums">
                      {new Date(item.when).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p class="text-gray-500 dark:text-gray-400 truncate text-xs">
                    {item.message}
                  </p>
                </div>
                <Show when={item.unseen}>
                  <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
                </Show>
              </a>
            )}
          </For>

          <Show when={panel().loading}>
            <div class="flex justify-center py-3">
              <span class="text-xs text-gray-400 animate-pulse">Loading…</span>
            </div>
          </Show>

          <Show when={!panel().hasMore && panel().items.length > 0}>
            <p class="text-xs text-gray-400 text-center py-2">All caught up ✓</p>
          </Show>
        </div>
      </Show>

    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotificationsAside() {
  const { store, toasts, togglePanel, handleScroll, markRead, formatCount } =
    useNotifications();

  return (
    <div class="flex flex-col h-full">
      <h2 class="text-lg font-bold mb-4 px-1">Notifications</h2>

      {/* Toast area */}
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

      {/* Panels */}
      <div class="flex-1 overflow-y-auto space-y-1">
        <For each={PANELS}>
          {(panel) => (
            <NotificationPanel
              type={panel.type}
              label={panel.label}
              icon={panel.icon}
              store={store}
              togglePanel={togglePanel}
              handleScroll={handleScroll}
              markRead={markRead}
              formatCount={formatCount}
            />
          )}
        </For>
      </div>
    </div>
  );
}
