import { createSignal, Show, For, onCleanup } from "solid-js";
import {
  MdFillClose,
  MdFillAdd,
  MdFillLocation_on,
  MdFillOpen_in_new,
} from "solid-icons/md";
import DOMPurify from "dompurify";
import { useI18n } from "@/i18n";
import type { CalEvent } from "../api";
import EventCreatorModal from "../widgets/EventCreatorModal";

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

interface Props {
  date: string;
  events: CalEvent[];
  onClose: () => void;
  onEventCreated?: () => void;
}

export default function DayDetailModal(props: Props) {
  const { t } = useI18n();
  const [activeEventId, setActiveEventId] = createSignal<number | null>(null);
  const [showCreator, setShowCreator] = createSignal(false);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && !showCreator()) props.onClose();
  }
  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  const dateLabel = () =>
    new Date(props.date + "T00:00:00").toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  const evCount = () => props.events.length;

  return (
    <>
      <div
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
      >
        <div class="bg-surface border border-rim rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div class="flex items-start justify-between px-5 pt-5 pb-4 border-b border-rim shrink-0 gap-3">
            <div class="min-w-0">
              <h2 class="text-base font-semibold text-txt leading-snug">{dateLabel()}</h2>
              <p class="text-xs text-muted mt-0.5">
                {evCount() === 0
                  ? t("calendar.no_events")
                  : `${evCount()} event${evCount() === 1 ? "" : "s"}`}
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreator(true)}
                class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium
                       bg-accent text-accent-fg hover:opacity-90 transition-opacity"
              >
                <MdFillAdd size={14} />
                {t("calendar.new_event")}
              </button>
              <button
                type="button"
                onClick={props.onClose}
                class="p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-txt transition-colors"
                aria-label="Close"
              >
                <MdFillClose size={16} />
              </button>
            </div>
          </div>

          {/* Event list */}
          <div class="overflow-y-auto flex-1 p-4 space-y-2">
            <Show
              when={evCount() > 0}
              fallback={
                <div class="flex flex-col items-center py-10 gap-2 text-center">
                  <p class="text-sm text-muted">{t("calendar.no_events")}</p>
                  <button
                    type="button"
                    onClick={() => setShowCreator(true)}
                    class="text-xs text-accent hover:underline mt-1"
                  >
                    {t("calendar.add_event_here")}
                  </button>
                </div>
              }
            >
              <For each={props.events}>
                {(ev) => (
                  <div>
                    <button
                      onClick={() =>
                        setActiveEventId((prev) =>
                          prev === ev.id ? null : ev.id,
                        )
                      }
                      class={`w-full text-left rounded-xl border p-3 transition-colors
                        ${activeEventId() === ev.id
                          ? "border-accent bg-accent-muted"
                          : "border-rim bg-surface hover:bg-elevated hover:border-rim-strong"}`}
                    >
                      <p class="text-sm font-medium text-txt leading-snug">
                        {ev.title || t("calendar.no_title")}
                      </p>
                      <p class="text-xs text-muted mt-0.5">
                        {fmtTime(ev.start, ev.allDay)}
                        <Show when={!ev.nofinish && ev.end}>
                          {" → "}
                          {fmtTime(ev.end!, ev.allDay)}
                        </Show>
                      </p>
                      <Show when={ev.location}>
                        <p class="flex items-center gap-1 text-xs text-muted mt-0.5">
                          <MdFillLocation_on size={12} />
                          {ev.location}
                        </p>
                      </Show>
                    </button>

                    <Show when={activeEventId() === ev.id}>
                      <EventDetailPanel event={ev} />
                    </Show>
                  </div>
                )}
              </For>
            </Show>
          </div>
        </div>
      </div>

      <Show when={showCreator()}>
        <EventCreatorModal
          defaultDate={props.date}
          onClose={() => setShowCreator(false)}
          onCreated={() => {
            setShowCreator(false);
            props.onEventCreated?.();
          }}
        />
      </Show>
    </>
  );
}

function EventDetailPanel(props: { event: CalEvent }) {
  const ev = props.event;
  const { t } = useI18n();
  const sanitized = () =>
    ev.description ? DOMPurify.sanitize(ev.description) : "";

  return (
    <div class="mt-1 ml-3 bg-base border border-rim/60 rounded-xl p-3.5 space-y-2">
      <div class="text-xs text-muted space-y-0.5">
        <p>{fmtFullDate(ev.start)}</p>
        <Show when={!ev.allDay}>
          <p>
            {fmtTime(ev.start, false)}
            <Show when={ev.end}>
              {" → "}
              {fmtTime(ev.end!, false)}
            </Show>
            {ev.timezone !== "UTC" ? ` (${ev.timezone})` : ""}
          </p>
        </Show>
        <Show when={ev.allDay}>
          <p>{t("calendar.all_day_event")}</p>
        </Show>
      </div>

      <Show when={sanitized()}>
        <div
          class="text-sm text-txt leading-relaxed prose prose-sm max-w-none"
          innerHTML={sanitized()}
        />
      </Show>

      <Show when={ev.plink}>
        <a
          href={ev.plink}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-xs text-accent hover:underline"
        >
          <MdFillOpen_in_new size={12} />
          {t("calendar.view_source")}
        </a>
      </Show>
    </div>
  );
}
