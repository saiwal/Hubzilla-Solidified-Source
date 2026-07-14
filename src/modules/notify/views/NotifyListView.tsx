// src/modules/notify/views/NotifyListView.tsx
import { For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import DOMPurify from "dompurify";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { useI18n } from "@/i18n";
import { markNotifySeen } from "@/shared/lib/markSeen";

interface NotifyEntry {
  notify_id?: number;
  notify_link?: string;
  name?: string;
  photo?: string;
  when?: string;
  message?: string;
}

async function fetchAlerts(): Promise<NotifyEntry[]> {
  const res = await fetch("/sse_bs/notify", { credentials: "same-origin" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: Record<string, { notifications?: NotifyEntry[] }> =
    await res.json();
  return data.notify?.notifications ?? [];
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
  const d = new Date(when.replace(" ", "T"));
  const diff = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotifyListView() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [entries, { refetch }] = createQueryResource<NotifyEntry[]>(
    "notify-alerts",
    fetchAlerts,
    { initialValue: [] },
  );

  function open(entry: NotifyEntry) {
    if (entry.notify_id) markNotifySeen(entry.notify_id);
    const path = toRelativePath(entry.notify_link);
    if (path.startsWith("/")) {
      navigate(path);
    } else if (entry.notify_link) {
      window.location.assign(entry.notify_link);
    }
  }

  return (
    <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Page header */}
      <div class="flex items-center gap-3">
        <svg
          class="w-5 h-5 text-accent shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        <h1 class="text-lg font-semibold text-txt">{t("notify.title")}</h1>
        <Show when={!entries.loading && (entries() ?? []).length > 0}>
          <span class="text-xs text-muted tabular-nums ml-auto">
            {(entries() ?? []).length}
          </span>
        </Show>
      </div>

      {/* Loading skeleton */}
      <Show when={entries.loading}>
        <div class="bg-surface border border-rim rounded-2xl overflow-hidden animate-pulse divide-y divide-rim">
          <For each={[1, 2, 3, 4]}>
            {() => (
              <div class="px-4 py-3 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-elevated shrink-0" />
                <div class="h-3 bg-elevated rounded flex-1" />
                <div class="h-3 bg-elevated rounded w-10" />
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Error state */}
      <Show when={!entries.loading && entries.error}>
        <div class="flex flex-col items-center gap-2 py-16 text-muted">
          <p class="text-sm">{entries.error?.message}</p>
          <button
            onClick={() => refetch()}
            class="text-xs text-accent hover:underline"
          >
            {t("notify.retry")}
          </button>
        </div>
      </Show>

      {/* Empty state */}
      <Show
        when={!entries.loading && !entries.error && (entries() ?? []).length === 0}
      >
        <div class="flex flex-col items-center gap-3 py-16 text-muted">
          <svg
            class="w-10 h-10 opacity-30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p class="text-sm font-medium">{t("notify.empty")}</p>
        </div>
      </Show>

      {/* Alerts list */}
      <Show when={!entries.loading && (entries() ?? []).length > 0}>
        <div class="bg-surface border border-rim rounded-2xl overflow-hidden shadow-sm divide-y divide-rim">
          <For each={entries()}>
            {(entry) => (
              <button
                type="button"
                onClick={() => open(entry)}
                class="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-elevated transition-colors"
              >
                <Show when={entry.photo}>
                  <img
                    src={entry.photo}
                    alt={entry.name ?? ""}
                    class="w-8 h-8 rounded-full shrink-0 object-cover"
                  />
                </Show>
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-txt leading-snug">
                    <Show when={entry.name}>
                      <span class="font-semibold">{entry.name} </span>
                    </Show>
                    <span
                      innerHTML={DOMPurify.sanitize(entry.message ?? "")}
                    />
                  </p>
                  <p class="text-xs text-muted mt-0.5">
                    {relativeTime(entry.when)}
                  </p>
                </div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
