// src/modules/cal/views/CalView.tsx
//
// A lightweight month-grid calendar.
// - Month navigation arrows drive loadCalendar() with monthRange()
// - Click a day cell to see its events in a right-hand detail panel
// - Click an event pill to open the full detail modal
// - createEffect (not onMount) so it re-fetches on :nick param changes

import {
  createEffect,
  createSignal,
  createMemo,
  Show,
  For,
} from "solid-js";
import { useParams } from "@solidjs/router";
import { usePageNick } from "@/shared/store/site-config";
import DOMPurify from "dompurify";
import {
  MdFillChevron_left,
  MdFillChevron_right,
  MdFillClose,
  MdFillLocation_on,
  MdFillOpen_in_new,
} from "solid-icons/md";
import {
  events,
  loading,
  error,
  loadCalendar,
  monthRange,
  selectedEvent,
  setSelectedEvent,
} from "../store";
import type { CalEvent } from "../api";

// ── date helpers ──────────────────────────────────────────────────────────────

function today() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

/** 0=Sun … 6=Sat */
function firstWeekday(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function eventDateKey(iso: string) {
  // "2026-05-18T..." → "2026-05-18"
  return iso.slice(0, 10);
}

function fmtTime(iso: string, allDay: boolean) {
  if (allDay) return "All day";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtFullDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── component ─────────────────────────────────────────────────────────────────

export default function CalView() {
  const params = useParams<{ nick?: string }>();
  const pageNick = usePageNick();

  const resolvedNick = () => params.nick || pageNick();

  const t = today();
  const [year, setYear] = createSignal(t.year);
  const [month, setMonth] = createSignal(t.month);
  const [activeDay, setActiveDay] = createSignal<string | null>(null);

  // ── load on nick / month change ───────────────────────────────────────────
  createEffect(() => {
    const nick = resolvedNick();
    const y = year();
    const m = month();
    if (!nick) return;
    loadCalendar(nick, monthRange(y, m));
  });

  // ── index events by date key ──────────────────────────────────────────────
  const eventsByDay = createMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events()) {
      const key = eventDateKey(ev.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  });

  // ── active day events ────────────────────────────────────────────────────
  const activeDayEvents = createMemo(() => {
    const d = activeDay();
    return d ? (eventsByDay().get(d) ?? []) : [];
  });

  // ── month navigation ──────────────────────────────────────────────────────
  function prevMonth() {
    if (month() === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setActiveDay(null);
    setSelectedEvent(null);
  }
  function nextMonth() {
    if (month() === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setActiveDay(null);
    setSelectedEvent(null);
  }

  // ── grid cells ────────────────────────────────────────────────────────────
  const cells = createMemo(() => {
    const y = year();
    const m = month();
    const days = daysInMonth(y, m);
    const offset = firstWeekday(y, m);
    // pad with nulls so day 1 lands on the correct weekday
    return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  });

  const todayKey = isoDate(t.year, t.month, new Date().getDate());

  const monthLabel = () =>
    new Date(year(), month() - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

  return (
    <div class="flex gap-4 h-full min-h-0">
      {/* ── Calendar grid ────────────────────────────────────────────────── */}
      <div class="flex-1 min-w-0 flex flex-col gap-3">
        {/* Header */}
        <div class="flex items-center justify-between">
          <h1 class="text-lg font-semibold text-txt">{monthLabel()}</h1>
          <div class="flex items-center gap-1">
            <Show when={loading()}>
              <span class="text-xs text-muted mr-2">Loading…</span>
            </Show>
            <button
              onClick={prevMonth}
              class="p-1.5 rounded-lg border border-rim text-muted hover:bg-elevated hover:text-txt transition-colors"
              aria-label="Previous month"
            >
              <MdFillChevron_left size={18} />
            </button>
            <button
              onClick={nextMonth}
              class="p-1.5 rounded-lg border border-rim text-muted hover:bg-elevated hover:text-txt transition-colors"
              aria-label="Next month"
            >
              <MdFillChevron_right size={18} />
            </button>
          </div>
        </div>

        <Show when={error()}>
          <p class="text-sm text-red-500">{error()}</p>
        </Show>

        {/* Weekday labels */}
        <div class="grid grid-cols-7 gap-px text-center">
          <For each={WEEKDAYS}>
            {(wd) => (
              <div class="text-xs font-medium text-muted py-1">{wd}</div>
            )}
          </For>
        </div>

        {/* Day cells */}
        <div class="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
          <For each={cells()}>
            {(day) => {
              if (day === null) {
                return <div class="bg-base rounded-lg" />;
              }
              const key = () => isoDate(year(), month(), day);
              const dayEvs = () => eventsByDay().get(key()) ?? [];
              const isToday = () => key() === todayKey;
              const isActive = () => activeDay() === key();

              return (
                <button
                  onClick={() => {
                    setActiveDay(key());
                    setSelectedEvent(null);
                  }}
                  class={`
                    relative flex flex-col gap-0.5 p-1 rounded-lg text-left
                    border transition-colors min-h-[64px]
                    ${isActive()
                      ? "border-accent bg-accent-muted"
                      : "border-rim bg-surface hover:bg-elevated hover:border-rim-strong"}
                  `}
                >
                  {/* Day number */}
                  <span
                    class={`
                      text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full
                      ${isToday()
                        ? "bg-accent text-accent-txt"
                        : "text-txt"}
                    `}
                  >
                    {day}
                  </span>

                  {/* Event pills — show up to 2, then "+N more" */}
                  <For each={dayEvs().slice(0, 2)}>
                    {(ev) => (
                      <span class="block truncate text-[10px] leading-tight px-1 py-0.5 rounded bg-accent-muted text-accent font-medium">
                        {ev.title || "(no title)"}
                      </span>
                    )}
                  </For>
                  <Show when={dayEvs().length > 2}>
                    <span class="text-[10px] text-muted pl-1">
                      +{dayEvs().length - 2} more
                    </span>
                  </Show>
                </button>
              );
            }}
          </For>
        </div>
      </div>

      {/* ── Side panel ───────────────────────────────────────────────────── */}
      <Show when={activeDay() !== null}>
        <aside class="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Day header */}
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-semibold text-txt">
              {new Date(activeDay()! + "T00:00:00").toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h2>
            <button
              onClick={() => { setActiveDay(null); setSelectedEvent(null); }}
              class="p-1 rounded-lg text-muted hover:bg-elevated hover:text-txt transition-colors"
            >
              <MdFillClose size={16} />
            </button>
          </div>

          {/* Event list or empty state */}
          <Show
            when={activeDayEvents().length > 0}
            fallback={
              <p class="text-sm text-muted">No events on this day.</p>
            }
          >
            <div class="flex flex-col gap-2">
              <For each={activeDayEvents()}>
                {(ev) => (
                  <EventListItem
                    event={ev}
                    active={selectedEvent()?.id === ev.id}
                    onClick={() =>
                      setSelectedEvent((prev) =>
                        prev?.id === ev.id ? null : ev,
                      )
                    }
                  />
                )}
              </For>
            </div>
          </Show>

          {/* Event detail */}
          <Show when={selectedEvent()}>
            <EventDetail event={selectedEvent()!} />
          </Show>
        </aside>
      </Show>
    </div>
  );
}

// ── EventListItem ─────────────────────────────────────────────────────────────

function EventListItem(props: {
  event: CalEvent;
  active: boolean;
  onClick: () => void;
}) {
  const ev = props.event;
  return (
    <button
      onClick={props.onClick}
      class={`
        w-full text-left rounded-xl border p-3 transition-colors
        ${props.active
          ? "border-accent bg-accent-muted"
          : "border-rim bg-surface hover:bg-elevated hover:border-rim-strong"}
      `}
    >
      <p class="text-sm font-medium text-txt leading-snug truncate">
        {ev.title || "(no title)"}
      </p>
      <p class="text-xs text-muted mt-0.5">
        {fmtTime(ev.start, ev.allDay)}
      </p>
    </button>
  );
}

// ── EventDetail ───────────────────────────────────────────────────────────────

function EventDetail(props: { event: CalEvent }) {
  const ev = props.event;

  const sanitizedDescription = () =>
    ev.description
      ? DOMPurify.sanitize(ev.description)
      : "";

  return (
    <div class="bg-surface border border-rim rounded-xl p-4 space-y-3">
      {/* Title */}
      <h3 class="text-base font-semibold text-txt leading-snug">
        {ev.title || "(no title)"}
      </h3>

      {/* Date / time */}
      <div class="text-xs text-muted space-y-0.5">
        <p>{fmtFullDate(ev.start)}</p>
        <Show when={!ev.allDay}>
          <p>
            {fmtTime(ev.start, false)}
            <Show when={ev.end}>
              {" "}→ {fmtTime(ev.end!, false)}
            </Show>
            {ev.timezone !== "UTC" ? ` (${ev.timezone})` : ""}
          </p>
        </Show>
        <Show when={ev.allDay}>
          <p>All-day event</p>
        </Show>
      </div>

      {/* Location */}
      <Show when={ev.location}>
        <div class="flex items-start gap-1.5 text-xs text-muted">
          <span class="shrink-0 mt-0.5">
            <MdFillLocation_on size={14} />
          </span>
          <span>{ev.location}</span>
        </div>
      </Show>

      {/* Description */}
      <Show when={sanitizedDescription()}>
        <div
          class="text-sm text-txt leading-relaxed prose prose-sm max-w-none"
          innerHTML={sanitizedDescription()}
        />
      </Show>

      {/* Permalink */}
      <Show when={ev.plink}>
        <a
          href={ev.plink}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <MdFillOpen_in_new size={12} />
          View source
        </a>
      </Show>
    </div>
  );
}
