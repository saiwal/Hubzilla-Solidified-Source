import { For, Show, createMemo } from "solid-js";
import type { CalEvent } from "../api";
import { weeksForMonth, weekLayout, todayKey } from "./calUtils";
import { useI18n } from "@/i18n";

const LANE_H = 22;
const DAY_NUM_H = 30;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  year: number;
  month: number;
  events: CalEvent[];
  onDayClick: (date: string) => void;
}

export default function MonthView(props: Props) {
  const { t } = useI18n();
  const todayK = todayKey();
  const monthPrefix = () => `${props.year}-${String(props.month).padStart(2, "0")}`;
  const weeks = createMemo(() => weeksForMonth(props.year, props.month));

  return (
    <div class="flex flex-col">
      {/* Weekday header */}
      <div class="grid grid-cols-7 border-b border-rim sticky top-0 bg-surface z-10">
        <For each={WEEKDAYS}>
          {(wd) => (
            <div class="text-center text-xs font-medium text-muted py-2 border-r border-rim last:border-r-0">
              {wd}
            </div>
          )}
        </For>
      </div>

      <For each={weeks()}>
        {(weekDates) => {
          const layout = createMemo(() => weekLayout(weekDates, props.events));

          return (
            <div class="relative border-b border-rim last:border-b-0">
              {/* Day cells — contain day number + spacer + single-day pills */}
              <div class="grid grid-cols-7">
                <For each={weekDates}>
                  {(date) => {
                    const inMonth = date.startsWith(monthPrefix());
                    const isToday = date === todayK;
                    const day = parseInt(date.slice(8));
                    const dayEvs = () => layout().singleDay.get(date) ?? [];
                    const spacerH = () => layout().lanes.length * LANE_H;

                    return (
                      <div
                        class={`border-r border-rim last:border-r-0 p-1 cursor-pointer
                          hover:bg-elevated transition-colors min-h-[80px]
                          ${inMonth ? "bg-surface" : "bg-base"}`}
                        onClick={() => props.onDayClick(date)}
                      >
                        <span
                          class={`text-xs font-semibold w-6 h-6 flex items-center justify-center
                            rounded-full mb-0.5
                            ${isToday ? "bg-accent text-accent-fg"
                              : inMonth ? "text-txt" : "text-muted"}`}
                        >
                          {day}
                        </span>
                        {/* Spacer reserves room for the absolute-positioned spanning bars */}
                        <Show when={spacerH() > 0}>
                          <div style={{ height: `${spacerH()}px` }} />
                        </Show>
                        <For each={dayEvs().slice(0, 2)}>
                          {(ev) => (
                            <div
                              class="text-[10px] leading-[18px] rounded px-1 mb-0.5 font-medium truncate"
                              style={ev.calendarColor
                                ? { background: ev.calendarColor + "33", color: ev.calendarColor }
                                : undefined}
                              classList={{ "bg-accent-muted text-accent": !ev.calendarColor }}
                            >
                              {ev.title || t("calendar.no_title")}
                            </div>
                          )}
                        </For>
                        <Show when={dayEvs().length > 2}>
                          <span class="text-[10px] text-muted pl-1">+{dayEvs().length - 2} more</span>
                        </Show>
                      </div>
                    );
                  }}
                </For>
              </div>

              {/* Spanning event bars — absolutely overlaid on the spacer area */}
              <Show when={layout().lanes.length > 0}>
                <div
                  class="absolute left-0 right-0 pointer-events-none"
                  style={{ top: `${DAY_NUM_H}px` }}
                >
                  <For each={layout().lanes}>
                    {(lane) => (
                      <div class="relative" style={{ height: `${LANE_H}px` }}>
                        <For each={lane}>
                          {(span) => {
                            const pct = 100 / 7;
                            const color = span.event.calendarColor;
                            return (
                              <div
                                class={`absolute top-0.5 bottom-0.5 text-[10px] leading-[18px] font-medium px-1
                                  truncate pointer-events-auto cursor-pointer
                                  ${span.startsBefore ? "" : "rounded-l"} ${span.endsAfter ? "" : "rounded-r"}`}
                                style={{
                                  left: span.startsBefore ? "0" : `calc(${span.startCol * pct}% + 2px)`,
                                  right: span.endsAfter ? "0" : `calc(${(6 - span.endCol) * pct}% + 2px)`,
                                  ...(color ? { background: color + "33", color } : {}),
                                }}
                                classList={{ "bg-accent-muted text-accent": !color }}
                                onClick={() => props.onDayClick(weekDates[span.startCol])}
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
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
}
