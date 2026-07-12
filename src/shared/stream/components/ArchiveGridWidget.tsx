// src/shared/stream/components/ArchiveGridWidget.tsx
//
// Alternate archive layout: an accordion of years, each expanding to a
// compact 4-column month grid instead of the flat month list in ArchiveWidget.
// Same API and props as ArchiveWidget.

import {
  type Component,
  createEffect,
  createSignal,
  For,
  on,
  Show,
} from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { useI18n } from "@/i18n";
import { toast } from "@/shared/store/toast";
import {
  fetchArchive,
  monthRange,
  type ArchiveWidgetProps,
  type ArchiveYear,
} from "./ArchiveWidget";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function GridSkeleton() {
  return (
    <div class="px-3 py-3 animate-pulse">
      <div class="h-2.5 w-12 bg-elevated rounded mx-1 mb-2" />
      <div class="grid grid-cols-4 gap-1">
        <For each={Array.from({ length: 12 })}>
          {() => <div class="h-9 bg-elevated rounded-lg" />}
        </For>
      </div>
    </div>
  );
}

const ArchiveGridWidget: Component<ArchiveWidgetProps> = (props) => {
  const { t } = useI18n();

  const [remote] = createQueryResource(
    "stream-archive",
    () => ({ channelNick: props.channelNick, type: props.type }),
    fetchArchive,
  );

  createEffect(
    on(() => remote.error, (err) => {
      if (err) toast.error((err as Error).message ?? t("widgets.load_error"));
    }),
  );

  const years = (): ArchiveYear[] => remote() ?? [];

  // All years start collapsed.
  const [expanded, setExpanded] = createSignal<Set<number>>(new Set());
  const toggleYear = (year: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const isActiveMonth = (year: number, month: number) => {
    const [db, de] = monthRange(year, month);
    return props.activeDbegin === db && props.activeDend === de;
  };

  return (
    <div class="bg-surface border border-rim rounded-xl overflow-hidden">
      <div class="px-4 py-3 border-b border-rim">
        <h3 class="text-sm font-semibold text-txt">{t("widgets.archive")}</h3>
      </div>

      <Show when={remote.loading}>
        <GridSkeleton />
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
                const counts = new Map(yr.months.map((m) => [m.month, m.count]));
                const isOpen = () => expanded().has(yr.year);
                return (
                  <li>
                    <button
                      type="button"
                      onClick={() => toggleYear(yr.year)}
                      class="w-full px-4 py-2.5 flex items-center gap-2 text-left
                             hover:bg-elevated transition-colors"
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

                    <Show when={isOpen()}>
                      <div class="grid grid-cols-4 gap-1 px-4 pb-3">
                        <For each={SHORT_MONTHS}>
                          {(name, i) => {
                            const month = i() + 1;
                            const count = counts.get(month) ?? 0;
                            const active = () => isActiveMonth(yr.year, month);
                            return (
                              <button
                                type="button"
                                disabled={count === 0}
                                onClick={() => props.onMonthClick?.(yr.year, month)}
                                title={count > 0 ? `${name} ${yr.year} — ${count}` : undefined}
                                class="rounded-lg py-1 text-center transition-colors"
                                classList={{
                                  "bg-accent-muted": active(),
                                  "hover:bg-elevated": !active() && count > 0,
                                  "opacity-40 cursor-default": count === 0,
                                }}
                              >
                                <span
                                  class="block text-xs"
                                  classList={{
                                    "text-accent font-medium": active(),
                                    "text-txt": !active(),
                                  }}
                                >
                                  {name}
                                </span>
                                <span
                                  class="block text-[10px]"
                                  classList={{
                                    "text-accent": active(),
                                    "text-muted": !active(),
                                  }}
                                >
                                  {count > 0 ? count : "·"}
                                </span>
                              </button>
                            );
                          }}
                        </For>
                      </div>
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

export default ArchiveGridWidget;
