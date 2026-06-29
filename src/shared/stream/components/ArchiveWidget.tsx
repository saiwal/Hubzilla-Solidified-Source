// src/shared/stream/components/ArchiveWidget.tsx
//
// API: GET /api/stream-widgets/archive?channel_nick=<nick>&type=<posts|articles>
// Response: { data: { archive: { year: number; count: number; months: { month: number; count: number }[] }[] } }

import {
  type Component,
  createEffect,
  createResource,
  createSignal,
  For,
  on,
  Show,
} from "solid-js";
import { useI18n } from "@/i18n";
import { toast } from "@/shared/store/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ArchiveMonth {
  month: number;
  count: number;
}
export interface ArchiveYear {
  year: number;
  count: number;
  months: ArchiveMonth[];
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchArchive(params: {
  channelNick?: string;
  type?: "articles" | "posts";
}): Promise<ArchiveYear[]> {
  const url = new URL("/api/stream-widgets/archive", window.location.origin);
  if (params.channelNick) url.searchParams.set("channel_nick", params.channelNick);
  if (params.type) url.searchParams.set("type", params.type);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  return data.archive ?? [];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthName(m: number) {
  return MONTH_NAMES[m - 1] ?? String(m);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Returns [dbegin, dend] for a given year+month (exclusive end = first of next month). */
export function monthRange(year: number, month: number): [string, string] {
  const dbegin = `${year}-${pad2(month)}-01`;
  const nextYear  = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const dend = `${nextYear}-${pad2(nextMonth)}-01`;
  return [dbegin, dend];
}

/** Parse YYYY-MM-DD → { year, month } or null. */
function parseYearMonth(s: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(s);
  if (!m) return null;
  return { year: parseInt(m[1]), month: parseInt(m[2]) };
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ArchiveSkeleton() {
  return (
    <ul class="divide-y divide-rim animate-pulse">
      <For each={[80, 60, 70]}>
        {(w) => (
          <li class="px-4 py-2.5 flex items-center gap-2">
            <div class="w-3 h-3 rounded bg-elevated shrink-0" />
            <div class="h-2.5 bg-elevated rounded" style={{ width: `${w}%` }} />
            <div class="ml-auto h-2.5 bg-elevated rounded w-6 shrink-0" />
          </li>
        )}
      </For>
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ArchiveWidgetProps {
  channelNick?: string;
  type?: "articles" | "posts";
  activeDbegin?: string;
  activeDend?: string;
  onMonthClick?: (year: number, month: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ArchiveWidget: Component<ArchiveWidgetProps> = (props) => {
  const { t } = useI18n();

  const [remote] = createResource(
    () => ({ channelNick: props.channelNick, type: props.type }),
    fetchArchive,
  );

  createEffect(
    on(() => remote.error, (err) => {
      if (err) toast.error((err as Error).message ?? t("widgets.load_error"));
    }),
  );

  const years = (): ArchiveYear[] => remote() ?? [];

  // Start with the most-recent year expanded.
  const [expanded, setExpanded] = createSignal<Set<number>>(new Set());
  createEffect(
    on(years, (ys) => {
      if (ys.length > 0 && expanded().size === 0) {
        setExpanded(new Set([ys[0].year]));
      }
    }),
  );

  const toggleYear = (year: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const activeYM = () => parseYearMonth(props.activeDbegin ?? "");

  const isActiveMonth = (year: number, month: number) => {
    const a = activeYM();
    if (!a) return false;
    const [db, de] = monthRange(year, month);
    return props.activeDbegin === db && props.activeDend === de;
  };

  return (
    <div class="bg-surface border border-rim rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-rim">
        <h3 class="text-sm font-semibold text-txt">{t("widgets.archive")}</h3>
      </div>

      <Show when={remote.loading}>
        <ArchiveSkeleton />
      </Show>

      <Show when={!remote.loading}>
        <Show
          when={years().length > 0}
          fallback={
            <p class="px-4 py-3 text-xs text-muted">{t("widgets.no_archive")}</p>
          }
        >
          <ul class="divide-y divide-rim">
            <For each={years()}>
              {(yr) => {
                const isOpen = () => expanded().has(yr.year);
                return (
                  <li>
                    {/* Year row */}
                    <button
                      type="button"
                      onClick={() => toggleYear(yr.year)}
                      class="w-full px-4 py-2.5 flex items-center gap-2 text-left
                             hover:bg-elevated transition-colors group"
                    >
                      <span
                        class="text-xs text-muted transition-transform duration-200 shrink-0"
                        style={{ transform: isOpen() ? "rotate(90deg)" : "rotate(0deg)" }}
                      >
                        ▶
                      </span>
                      <span class="flex-1 text-sm font-medium text-txt">{yr.year}</span>
                      <span class="text-xs text-muted shrink-0">{yr.count}</span>
                    </button>

                    {/* Month list */}
                    <Show when={isOpen()}>
                      <ul>
                        <For each={yr.months}>
                          {(mo) => {
                            const active = () => isActiveMonth(yr.year, mo.month);
                            return (
                              <li>
                                <button
                                  type="button"
                                  onClick={() => props.onMonthClick?.(yr.year, mo.month)}
                                  class="w-full pl-9 pr-4 py-2 flex items-center gap-2 text-left
                                         hover:bg-elevated transition-colors"
                                  classList={{ "bg-accent-muted": active() }}
                                >
                                  <span
                                    class="flex-1 text-sm transition-colors"
                                    classList={{
                                      "text-accent font-medium": active(),
                                      "text-txt": !active(),
                                    }}
                                  >
                                    {monthName(mo.month)}
                                  </span>
                                  <span class="text-xs text-muted shrink-0">{mo.count}</span>
                                </button>
                              </li>
                            );
                          }}
                        </For>
                      </ul>
                    </Show>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
      </Show>
    </div>
  );
};

export default ArchiveWidget;
