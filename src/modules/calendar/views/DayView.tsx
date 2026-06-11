import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { CalEvent } from "../api";
import {
  HOUR_H, isoDateStr, todayKey,
  columnLayout, eventTopPx, eventHeightPx,
} from "./calUtils";
import { useI18n } from "@/i18n";

interface Props {
  date: Date;
  events: CalEvent[];
  onDayClick: (date: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIME_W = 44;

/** Subtract one UTC day from a YYYY-MM-DD string (for CalDAV exclusive end-date normalization). */
function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function nowY() {
  const n = new Date();
  return (n.getHours() + n.getMinutes() / 60) * HOUR_H;
}

export default function DayView(props: Props) {
  const { t } = useI18n();
  const todayK = todayKey();

  const dateStr = createMemo(() => isoDateStr(props.date));
  const isToday = createMemo(() => dateStr() === todayK);

  const allDayEvs = createMemo(() =>
    props.events.filter(ev => {
      if (ev.allDay) {
        // Use UTC date slices for all-day events (no meaningful timezone offset).
        const startD = ev.start.slice(0, 10);
        const endD = ev.end ? ev.end.slice(0, 10) : startD;
        // CalDAV uses exclusive DTEND (next day); channel events use inclusive DTEND (same day).
        // Normalize to inclusive so a June 10 CalDAV event doesn't bleed into June 11.
        const inclusiveEnd = (ev.end && endD > startD) ? prevDay(endD) : endD;
        return startD <= dateStr() && inclusiveEnd >= dateStr();
      }
      // Multi-day timed events that started before this day but extend through it
      const s = isoDateStr(new Date(ev.start));
      const e = isoDateStr(new Date(ev.end ?? ev.start));
      return s < dateStr() && e >= dateStr();
    })
  );

  const timedEvs = createMemo(() =>
    props.events.filter(ev => {
      if (ev.allDay) return false;
      // Use local-time date comparison to match how dateStr() is computed
      return isoDateStr(new Date(ev.start)) === dateStr();
    })
  );

  const colItems = createMemo(() => columnLayout(timedEvs()));

  const [curY, setCurY] = createSignal(nowY());
  const timer = setInterval(() => setCurY(nowY()), 60_000);
  onCleanup(() => clearInterval(timer));

  let scrollRef!: HTMLDivElement;
  onMount(() => scrollRef?.scrollTo({ top: 7 * HOUR_H - 16 }));

  const dayLabel = createMemo(() =>
    props.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
  );

  return (
    <div class="flex flex-col h-full border border-rim rounded-xl overflow-hidden">
      {/* Day header */}
      <div class={`px-4 py-3 border-b border-rim shrink-0 ${isToday() ? "bg-accent-muted/30" : "bg-surface"}`}>
        <span class="text-sm font-semibold text-txt">{dayLabel()}</span>
      </div>

      {/* All-day events */}
      <Show when={allDayEvs().length > 0}>
        <div class="border-b border-rim px-3 py-2 flex flex-col gap-1 shrink-0">
          <For each={allDayEvs()}>
            {(ev) => {
              const color = ev.calendarColor;
              return (
                <div
                  class="text-xs font-medium rounded px-2 py-0.5 truncate cursor-pointer"
                  style={color ? { background: color + "33", color } : undefined}
                  classList={{ "bg-accent-muted text-accent": !color }}
                  onClick={() => props.onDayClick(dateStr())}
                >
                  {ev.title || t("calendar.no_title")}
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* Time grid */}
      <div class="flex-1 overflow-y-auto" ref={scrollRef!}>
        <div
          class="relative"
          style={{
            display: "grid",
            "grid-template-columns": `${TIME_W}px 1fr`,
            height: `${24 * HOUR_H}px`,
          }}
        >
          {/* Time labels */}
          <div class="relative border-r border-rim">
            <For each={HOURS}>
              {(h) => (
                <div
                  class="absolute right-2 text-[10px] text-muted leading-none"
                  style={{ top: `${h * HOUR_H - 6}px` }}
                >
                  {h > 0 ? `${h}:00` : ""}
                </div>
              )}
            </For>
          </div>

          {/* Event column */}
          <div
            class={`relative overflow-hidden ${isToday() ? "bg-accent-muted/10" : ""}`}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("[data-ev]")) return;
              props.onDayClick(dateStr());
            }}
          >
            {/* Hour lines */}
            <For each={HOURS}>
              {(h) => (
                <div
                  class="absolute left-0 right-0 border-t border-rim"
                  style={{ top: `${h * HOUR_H}px` }}
                />
              )}
            </For>

            {/* Current time */}
            <Show when={isToday()}>
              <div
                class="absolute left-0 right-0 z-10 pointer-events-none"
                style={{ top: `${curY()}px` }}
              >
                <div class="relative">
                  <div class="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                  <div class="border-t border-red-500 w-full" />
                </div>
              </div>
            </Show>

            {/* Timed events */}
            <For each={colItems()}>
              {(item) => {
                const color = item.event.calendarColor;
                const top = eventTopPx(item.event.start);
                const rawH = eventHeightPx(item.event.start, item.event.end);
                // Cap at midnight so multi-day events don't overflow the 24-hour grid
                const height = Math.min(rawH, 24 * HOUR_H - top);
                const crossesMidnight = rawH > height;
                const fmt = { hour: "numeric", minute: "2-digit" } as const;
                const startLbl = new Date(item.event.start).toLocaleTimeString(undefined, fmt);
                const endLbl = item.event.end
                  ? new Date(item.event.end).toLocaleTimeString(undefined, fmt)
                  : null;
                return (
                  <div
                    data-ev
                    class="absolute rounded overflow-hidden px-2 py-1 text-xs font-medium
                      cursor-pointer leading-snug"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `calc(${(item.col / item.totalCols) * 100}% + 2px)`,
                      width: `calc(${(1 / item.totalCols) * 100}% - 4px)`,
                      ...(color
                        ? { background: color + "44", color, "border-left": `3px solid ${color}` }
                        : {}),
                    }}
                    classList={{ "bg-accent-muted text-accent border-l-2 border-l-accent": !color }}
                    onClick={() => props.onDayClick(dateStr())}
                  >
                    <div class="font-semibold truncate">{item.event.title || t("calendar.no_title")}</div>
                    <div class="opacity-70 text-[10px]">
                      {startLbl}{endLbl ? ` – ${crossesMidnight ? endLbl + " →" : endLbl}` : ""}
                    </div>
                    <Show when={item.event.location}>
                      <div class="opacity-60 text-[10px] truncate">{item.event.location}</div>
                    </Show>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}
