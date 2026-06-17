import {
  createEffect, createSignal, createMemo, Show,
} from "solid-js";
import { useParams } from "@solidjs/router";
import { usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import { MdFillChevron_left, MdFillChevron_right } from "solid-icons/md";
import {
  events, loading, loadCalendar, monthRange, calendarRefreshVersion,
} from "../store";
import type { CalEvent, CalRange } from "../api";
import DayDetailModal from "./DayDetailModal";
import EventCreatorModal from "../widgets/EventCreatorModal";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import ListView from "./ListView";
import { isoDateStr, startOfWeek, addDays } from "./calUtils";

type ViewType = "month" | "week" | "day" | "list";

function rangeForView(view: ViewType, anchor: Date): CalRange {
  if (view === "month" || view === "list") {
    return monthRange(anchor.getFullYear(), anchor.getMonth() + 1);
  }
  if (view === "week") {
    const s = startOfWeek(anchor);
    return { start: isoDateStr(s), end: isoDateStr(addDays(s, 7)) };
  }
  return { start: isoDateStr(anchor), end: isoDateStr(addDays(anchor, 1)) };
}

export default function CalView() {
  const params = useParams<{ nick?: string }>();
  const pageNick = usePageNick();
  const { t } = useI18n();

  const resolvedNick = () => params.nick || pageNick();

  const today = new Date();
  const [viewType, setViewType] = createSignal<ViewType>("month");
  const [anchor, setAnchor] = createSignal(today);
  const [activeDay, setActiveDay] = createSignal<string | null>(null);
  const [showModal, setShowModal] = createSignal(false);
  const [showCreator, setShowCreator] = createSignal(false);

  const fetchRange = createMemo(() => rangeForView(viewType(), anchor()));

  createEffect(() => {
    const version = calendarRefreshVersion();
    const nick = resolvedNick();
    const r = fetchRange();
    if (!nick) return;
    loadCalendar(nick, r, version > 0);
  });

  function navigate(dir: -1 | 1) {
    setAnchor(d => {
      const nd = new Date(d);
      if (viewType() === "month" || viewType() === "list") nd.setMonth(nd.getMonth() + dir);
      else if (viewType() === "week") nd.setDate(nd.getDate() + dir * 7);
      else nd.setDate(nd.getDate() + dir);
      return nd;
    });
  }

  const periodLabel = createMemo(() => {
    const d = anchor();
    const v = viewType();
    if (v === "month")
      return new Date(d.getFullYear(), d.getMonth(), 1)
        .toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (v === "week") {
      const s = startOfWeek(d);
      const e = addDays(s, 6);
      return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    }
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  });

  function handleDayClick(date: string) {
    setActiveDay(date);
    setShowModal(true);
  }

  function refreshCurrent() {
    const nick = resolvedNick();
    if (nick) loadCalendar(nick, fetchRange(), true);
  }

  const activeDayEvs = createMemo<CalEvent[]>(() => {
    const d = activeDay();
    if (!d) return [];
    return events().filter(ev =>
      ev.start.slice(0, 10) <= d && (ev.end ?? ev.start).slice(0, 10) >= d
    );
  });

  const VIEWS: { key: ViewType; label: () => string }[] = [
    { key: "month", label: () => t("calendar.view_month") as string },
    { key: "week",  label: () => t("calendar.view_week")  as string },
    { key: "day",   label: () => t("calendar.view_day")   as string },
    { key: "list",  label: () => t("calendar.view_list")  as string },
  ];

  return (
    <div class="flex flex-col gap-3 h-full min-h-0">
      {/* Header */}
      <div class="flex items-center gap-2 flex-wrap">
        <h1 class="text-lg font-semibold text-txt mr-auto">{periodLabel()}</h1>
        <Show when={loading()}>
          <span class="text-xs text-muted">{t("calendar.loading")}</span>
        </Show>

        {/* View switcher */}
        <div class="flex rounded-lg border border-rim overflow-hidden shrink-0">
          {VIEWS.map(v => (
            <button
              type="button"
              onClick={() => setViewType(v.key)}
              class={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewType() === v.key
                  ? "bg-accent text-accent-fg"
                  : "text-muted hover:bg-elevated hover:text-txt"
              }`}
            >
              {v.label()}
            </button>
          ))}
        </div>

        {/* New event */}
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

        {/* Navigation */}
        <div class="flex items-center gap-1">
          <button
            onClick={() => navigate(-1)}
            class="p-1.5 rounded-lg border border-rim text-muted hover:bg-elevated hover:text-txt transition-colors"
            aria-label="Previous"
          >
            <MdFillChevron_left size={18} />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            class="px-2 py-1 text-xs rounded-lg border border-rim text-muted hover:bg-elevated hover:text-txt transition-colors"
          >
            {t("calendar.today") as string}
          </button>
          <button
            onClick={() => navigate(1)}
            class="p-1.5 rounded-lg border border-rim text-muted hover:bg-elevated hover:text-txt transition-colors"
            aria-label="Next"
          >
            <MdFillChevron_right size={18} />
          </button>
        </div>
      </div>

      {/* View content */}
      <div class="flex-1 min-h-0 overflow-auto">
        <Show when={viewType() === "month"}>
          <MonthView
            year={anchor().getFullYear()}
            month={anchor().getMonth() + 1}
            events={events()}
            onDayClick={handleDayClick}
          />
        </Show>
        <Show when={viewType() === "week"}>
          <WeekView
            anchor={anchor()}
            events={events()}
            onDayClick={handleDayClick}
          />
        </Show>
        <Show when={viewType() === "day"}>
          <DayView
            date={anchor()}
            events={events()}
            onDayClick={handleDayClick}
          />
        </Show>
        <Show when={viewType() === "list"}>
          <ListView events={events()} />
        </Show>
      </div>

      <Show when={showModal() && activeDay()}>
        <DayDetailModal
          date={activeDay()!}
          events={activeDayEvs()}
          onClose={() => { setShowModal(false); setActiveDay(null); }}
          onEventCreated={refreshCurrent}
        />
      </Show>

      <Show when={showCreator()}>
        <EventCreatorModal
          onClose={() => setShowCreator(false)}
          onCreated={() => { setShowCreator(false); refreshCurrent(); }}
        />
      </Show>
    </div>
  );
}
