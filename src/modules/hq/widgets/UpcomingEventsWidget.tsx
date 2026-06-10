import { createSignal, For, Show, onMount } from "solid-js";
import { toast } from "@/shared/store/toast";
import { currentNick } from "@/shared/store/auth-store";
import { fetchEvents, type CalEvent } from "@/modules/calendar/api";
import EventCreatorModal from "@/modules/calendar/widgets/EventCreatorModal";
import { useI18n } from "@/i18n";

function next30DaysRange() {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function fmtMonth(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short" });
}

function fmtDay(iso: string) {
  return new Date(iso).getDate();
}

function fmtTime(iso: string, allDay: boolean, allDayLabel: string) {
  if (allDay) return allDayLabel;
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

const SkeletonRow = () => (
  <div class="px-4 py-3 flex items-center gap-3 animate-pulse">
    <div class="w-9 h-10 rounded-lg bg-overlay shrink-0" />
    <div class="flex-1 space-y-2">
      <div class="h-3 bg-overlay rounded w-3/5" />
      <div class="h-3 bg-overlay rounded w-2/5" />
    </div>
  </div>
);

export default function UpcomingEventsWidget() {
  const { t } = useI18n();
  const [events, setEvents] = createSignal<CalEvent[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [showCreator, setShowCreator] = createSignal(false);

  async function load() {
    const nick = currentNick();
    if (!nick) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvents(nick, next30DaysRange());
      setEvents(data.slice(0, 8));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load events";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  onMount(load);

  return (
    <>
      <div class="bg-surface border border-rim rounded-2xl shadow-sm flex flex-col overflow-hidden">

        {/* Header */}
        <div class="px-4 pt-3.5 pb-3 flex items-center justify-between border-b border-rim shrink-0">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 class="text-sm font-semibold text-txt">{t("hq.upcoming_events")}</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowCreator(true)}
            class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
                   bg-accent text-accent-fg hover:opacity-90 transition-opacity"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            {t("hq.new_event")}
          </button>
        </div>

        {/* Body */}
        <div class="flex flex-col">
          <Show when={loading()}>
            <For each={[1, 2, 3]}>{() => <SkeletonRow />}</For>
          </Show>

          <Show when={!loading() && error()}>
            <div class="px-4 py-4 text-center">
              <button onClick={load} class="text-xs text-accent hover:underline">{t("hq.retry")}</button>
            </div>
          </Show>

          <Show when={!loading() && !error() && events().length === 0}>
            <div class="px-4 py-8 flex flex-col items-center gap-2 text-muted">
              <svg class="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span class="text-xs">{t("hq.no_upcoming_events")}</span>
              <button
                type="button"
                onClick={() => setShowCreator(true)}
                class="text-xs text-accent hover:underline mt-1"
              >
                {t("hq.create_one")}
              </button>
            </div>
          </Show>

          <For each={events()}>
            {(ev, i) => (
              <div
                class={`px-4 py-3 flex items-center gap-3 hover:bg-elevated transition-colors
                  ${i() < events().length - 1 ? "border-b border-rim" : ""}`}
              >
                {/* Date badge — colored when from a CalDAV calendar */}
                <div
                  class="shrink-0 flex flex-col items-center justify-center w-9 h-10 rounded-lg"
                  style={ev.calendarColor
                    ? { background: ev.calendarColor + "22", color: ev.calendarColor }
                    : undefined}
                  classList={{ "bg-accent-muted": !ev.calendarColor }}
                >
                  <span
                    class="text-[9px] font-bold uppercase tracking-wide leading-none"
                    classList={{ "text-accent": !ev.calendarColor }}
                  >
                    {fmtMonth(ev.start)}
                  </span>
                  <span
                    class="text-base font-bold leading-tight"
                    classList={{ "text-accent": !ev.calendarColor }}
                  >
                    {fmtDay(ev.start)}
                  </span>
                </div>

                {/* Info */}
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-txt truncate leading-snug">
                    {ev.title || "(no title)"}
                  </p>
                  <p class="text-xs text-muted mt-0.5 truncate">
                    {fmtTime(ev.start, ev.allDay, t("hq.all_day"))}
                    <Show when={ev.location}>
                      <span class="mx-1 opacity-40">·</span>
                      {ev.location}
                    </Show>
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <Show when={showCreator()}>
        <EventCreatorModal
          onClose={() => setShowCreator(false)}
          onCreated={load}
        />
      </Show>
    </>
  );
}
