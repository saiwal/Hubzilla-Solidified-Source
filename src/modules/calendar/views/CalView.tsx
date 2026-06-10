// src/modules/cal/views/CalView.tsx
//
// Month-grid calendar.
// - Month navigation drives loadCalendar() with monthRange()
// - Clicking a day cell opens DayDetailModal
// - createEffect (not onMount) re-fetches on :nick param changes

import {
  createEffect,
  createSignal,
  createMemo,
  Show,
  For,
} from "solid-js";
import { useParams } from "@solidjs/router";
import { usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import {
  MdFillChevron_left,
  MdFillChevron_right,
} from "solid-icons/md";
import {
  events,
  loading,
  loadCalendar,
  monthRange,
  calendarRefreshVersion,
} from "../store";
import type { CalEvent } from "../api";
import DayDetailModal from "./DayDetailModal";
import EventCreatorModal from "../widgets/EventCreatorModal";
import { importCalendar } from "../api";
import { toast } from "@/shared/store/toast";

// ── date helpers ──────────────────────────────────────────────────────────────

function today() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
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
  return iso.slice(0, 10);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── component ─────────────────────────────────────────────────────────────────

export default function CalView() {
  const params = useParams<{ nick?: string }>();
  const pageNick = usePageNick();
  const { t } = useI18n();

  const resolvedNick = () => params.nick || pageNick();

  const todayDate = today();
  const [year, setYear] = createSignal(todayDate.year);
  const [month, setMonth] = createSignal(todayDate.month);
  const [activeDay, setActiveDay] = createSignal<string | null>(null);
  const [showModal, setShowModal] = createSignal(false);
  const [showCreator, setShowCreator] = createSignal(false);
  const [importing, setImporting] = createSignal(false);

  // ── load on nick / month / calendar toggle change ────────────────────────
  createEffect(() => {
    const version = calendarRefreshVersion(); // track — re-runs when a calendar is toggled
    const nick = resolvedNick();
    const y = year();
    const m = month();
    if (!nick) return;
    loadCalendar(nick, monthRange(y, m), version > 0);
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

  const activeDayEvents = createMemo(() => {
    const d = activeDay();
    return d ? (eventsByDay().get(d) ?? []) : [];
  });

  // ── month navigation ──────────────────────────────────────────────────────
  function prevMonth() {
    if (month() === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setActiveDay(null);
    setShowModal(false);
  }
  function nextMonth() {
    if (month() === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setActiveDay(null);
    setShowModal(false);
  }

  function refreshCurrentMonth() {
    const nick = resolvedNick();
    if (nick) loadCalendar(nick, monthRange(year(), month()), true);
  }

  function handleExport() {
    const nick = resolvedNick();
    if (!nick) return;
    const a = document.createElement("a");
    a.href = `/api/cal/${encodeURIComponent(nick)}?export=ical`;
    a.download = `${nick}-calendar.ics`;
    a.click();
  }

  async function handleImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const result = await importCalendar(text);
      toast.success(`${t("calendar.import_success")} (${result.imported} events)`);
      refreshCurrentMonth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("calendar.import_failed"));
    } finally {
      setImporting(false);
      input.value = "";
    }
  }

  // ── grid cells ────────────────────────────────────────────────────────────
  const cells = createMemo(() => {
    const y = year();
    const m = month();
    const days = daysInMonth(y, m);
    const offset = firstWeekday(y, m);
    return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  });

  const todayKey = isoDate(todayDate.year, todayDate.month, todayDate.day);

  const monthLabel = () =>
    new Date(year(), month() - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });

  return (
    <div class="flex flex-col gap-3 h-full min-h-0">
      {/* Header row */}
      <div class="flex items-center gap-2 flex-wrap">
        <h1 class="text-lg font-semibold text-txt mr-auto">{monthLabel()}</h1>
        <Show when={loading()}>
          <span class="text-xs text-muted">{t("calendar.loading")}</span>
        </Show>

        {/* New Event */}
        <button
          type="button"
          onClick={() => setShowCreator(true)}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                 bg-accent text-accent-fg hover:opacity-90 transition-opacity"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          {t("calendar.new_event")}
        </button>

        {/* Export */}
        <button
          type="button"
          onClick={handleExport}
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                 border border-rim text-muted hover:bg-elevated hover:text-txt transition-colors"
          title={t("calendar.export_ical") as string}
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span class="hidden sm:inline">{t("calendar.export_ical")}</span>
        </button>

        {/* Import */}
        <label
          class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                 border border-rim text-muted hover:bg-elevated hover:text-txt transition-colors cursor-pointer
                 ${importing() ? "opacity-60 pointer-events-none" : ""}`}
          title={t("calendar.import_ical") as string}
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
          </svg>
          <span class="hidden sm:inline">
            {importing() ? t("calendar.importing") : t("calendar.import_ical")}
          </span>
          <input
            type="file"
            accept=".ics,.ical,text/calendar"
            class="hidden"
            onChange={handleImport}
            disabled={importing()}
          />
        </label>

        {/* Month nav */}
        <div class="flex items-center gap-1">
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
            const isActive = () => activeDay() === key() && showModal();

            return (
              <button
                onClick={() => {
                  setActiveDay(key());
                  setShowModal(true);
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
                      ? "bg-accent text-accent-fg"
                      : "text-txt"}
                  `}
                >
                  {day}
                </span>

                {/* Event pills — show up to 2, then "+N more" */}
                <For each={dayEvs().slice(0, 2)}>
                  {(ev) => (
                    <span
                      class="block truncate text-[10px] leading-tight px-1 py-0.5 rounded font-medium"
                      style={ev.calendarColor
                        ? { background: ev.calendarColor + "33", color: ev.calendarColor }
                        : undefined}
                      classList={{ "bg-accent-muted text-accent": !ev.calendarColor }}
                    >
                      {ev.title || t("calendar.no_title")}
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

      {/* Day detail modal */}
      <Show when={showModal() && activeDay() !== null}>
        <DayDetailModal
          date={activeDay()!}
          events={activeDayEvents()}
          onClose={() => { setShowModal(false); setActiveDay(null); }}
          onEventCreated={refreshCurrentMonth}
        />
      </Show>

      {/* New event modal (from header button) */}
      <Show when={showCreator()}>
        <EventCreatorModal
          onClose={() => setShowCreator(false)}
          onCreated={() => { setShowCreator(false); refreshCurrentMonth(); }}
        />
      </Show>
    </div>
  );
}
