import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { CalEvent } from "../api";
import {
  HOUR_H, localDay, startOfWeek, addDays, isoDateStr, todayKey,
  weekLayout, columnLayout, eventTopPx, eventHeightPx,
} from "./calUtils";
import { useI18n } from "@/i18n";

interface Props {
  anchor: Date;
  events: CalEvent[];
  onDayClick: (date: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TIME_W = 44;

function nowY() {
  const n = new Date();
  return (n.getHours() + n.getMinutes() / 60) * HOUR_H;
}

export default function WeekView(props: Props) {
  const { t } = useI18n();
  const todayK = todayKey();

  const weekDates = createMemo(() => {
    const s = startOfWeek(new Date(props.anchor));
    return Array.from({ length: 7 }, (_, i) => isoDateStr(addDays(s, i)));
  });

  // All-day events + multi-day timed events → banner strip.
  // Single-day timed events → time grid (timedByDay).
  const allDayEvs = createMemo(() =>
    props.events.filter(ev =>
      ev.allDay || localDay(ev.start) !== localDay(ev.end ?? ev.start)
    )
  );

  const timedByDay = createMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of props.events) {
      if (ev.allDay) continue;
      const s = localDay(ev.start);
      const e = localDay(ev.end ?? ev.start);
      if (s === e) {
        if (!map.has(s)) map.set(s, []);
        map.get(s)!.push(ev);
      }
    }
    return map;
  });

  // allInLanes=true: single-day all-day events also appear in the banner (not just multi-day ones).
  const banner = createMemo(() => weekLayout(weekDates(), allDayEvs(), true));
  const [curY, setCurY] = createSignal(nowY());
  const timer = setInterval(() => setCurY(nowY()), 60_000);
  onCleanup(() => clearInterval(timer));

  let gridRef!: HTMLDivElement;
  onMount(() => gridRef?.scrollTo({ top: 7 * HOUR_H - 16 }));

  return (
    <div class="flex flex-col h-full border border-rim rounded-xl overflow-hidden">
      {/* Day headers */}
      <div
        class="grid border-b border-rim bg-surface shrink-0"
        style={{ "grid-template-columns": `${TIME_W}px repeat(7, 1fr)` }}
      >
        <div class="border-r border-rim" />
        <For each={weekDates()}>
          {(date) => {
            const isToday = date === todayK;
            const d = new Date(date + "T12:00:00");
            return (
              <div
                class={`text-center py-2 border-r border-rim last:border-r-0 cursor-pointer
                  hover:bg-elevated transition-colors ${isToday ? "bg-accent-muted/30" : ""}`}
                onClick={() => props.onDayClick(date)}
              >
                <div class="text-[10px] font-medium text-muted uppercase">
                  {d.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div
                  class={`text-sm font-bold mx-auto w-7 h-7 flex items-center justify-center
                    rounded-full mt-0.5 ${isToday ? "bg-accent text-accent-fg" : "text-txt"}`}
                >
                  {d.getDate()}
                </div>
              </div>
            );
          }}
        </For>
      </div>

      {/* All-day banner */}
      <Show when={banner().lanes.length > 0}>
        <div
          class="border-b border-rim shrink-0"
          style={{ "grid-template-columns": `${TIME_W}px 1fr`, display: "grid" }}
        >
          <div class="border-r border-rim text-[10px] text-muted flex items-center justify-end pr-2">
            all‑day
          </div>
          <div
            class="relative"
            style={{ "min-height": `${banner().lanes.length * 22 + 6}px` }}
          >
            <For each={banner().lanes}>
              {(lane, li) => (
                <div
                  class="absolute left-0 right-0"
                  style={{ top: `${li() * 22 + 3}px`, height: "20px" }}
                >
                  <For each={lane}>
                    {(span) => {
                      const pct = 100 / 7;
                      const color = span.event.calendarColor;
                      return (
                        <div
                          class={`absolute h-full text-[10px] leading-[20px] font-medium px-1 truncate
                            cursor-pointer ${span.startsBefore ? "" : "rounded-l"} ${span.endsAfter ? "" : "rounded-r"}`}
                          style={{
                            left: span.startsBefore ? "0" : `calc(${span.startCol * pct}% + 2px)`,
                            right: span.endsAfter ? "0" : `calc(${(6 - span.endCol) * pct}% + 2px)`,
                            ...(color ? { background: color + "33", color } : {}),
                          }}
                          classList={{ "bg-accent-muted text-accent": !color }}
                          onClick={() => props.onDayClick(weekDates()[span.startCol])}
                        >
                          {!span.startsBefore && (span.event.title || t("calendar.no_title"))}
                        </div>
                      );
                    }}
                  </For>
                </div>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Scrollable time grid */}
      <div class="flex-1 overflow-y-auto" ref={gridRef!}>
        <div
          class="relative"
          style={{
            "display": "grid",
            "grid-template-columns": `${TIME_W}px repeat(7, 1fr)`,
            "height": `${24 * HOUR_H}px`,
          }}
        >
          {/* Time labels + row lines */}
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

          {/* Day columns */}
          <For each={weekDates()}>
            {(date) => {
              const isToday = date === todayK;
              const items = createMemo(() => columnLayout(timedByDay().get(date) ?? []));

              return (
                <div
                  class={`relative border-r border-rim last:border-r-0 ${isToday ? "bg-accent-muted/10" : ""}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest("[data-ev]")) return;
                    props.onDayClick(date);
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

                  {/* Current-time bar */}
                  <Show when={isToday}>
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
                  <For each={items()}>
                    {(item) => {
                      const color = item.event.calendarColor;
                      const top = eventTopPx(item.event.start);
                      const height = eventHeightPx(item.event.start, item.event.end);
                      const startLbl = new Date(item.event.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
                      return (
                        <div
                          data-ev
                          class="absolute rounded overflow-hidden px-1 py-0.5 text-[10px] font-medium
                            cursor-pointer leading-snug"
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            left: `${(item.col / item.totalCols) * 100}%`,
                            width: `calc(${(1 / item.totalCols) * 100}% - 2px)`,
                            "margin-left": "1px",
                            ...(color
                              ? { background: color + "44", color, "border-left": `3px solid ${color}` }
                              : {}),
                          }}
                          classList={{ "bg-accent-muted text-accent border-l-2 border-l-accent": !color }}
                          onClick={() => props.onDayClick(date)}
                        >
                          <div class="font-semibold truncate">{item.event.title || t("calendar.no_title")}</div>
                          <div class="opacity-70">{startLbl}</div>
                        </div>
                      );
                    }}
                  </For>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
