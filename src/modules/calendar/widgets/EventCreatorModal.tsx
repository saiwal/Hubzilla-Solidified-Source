import { createSignal, Show, For, onMount, onCleanup } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { toast } from "@/shared/store/toast";
import { createEvent, editEvent } from "../api";
import type { CalEvent } from "../api";
import { fetchCdavCalendars } from "../api/cdav";
import { useI18n } from "@/i18n";

interface Props {
  onClose: () => void;
  onCreated?: () => void;
  onEdited?: () => void;
  defaultDate?: string; // YYYY-MM-DD, pre-fills start date
  /** When provided, the modal is in edit mode */
  event?: CalEvent;
}

interface CalendarOption {
  label: string;
  color: string;
  calendarId?: number;
  calendarInstanceId?: number;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

// All-day events store a calendar date with no timezone adjustment — use the
// raw date string. Timed events come back with a server-timezone offset, so
// convert to browser-local to match what the display shows.
function isoToDate(iso: string, allDay = false) {
  if (allDay) return iso.slice(0, 10);
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isoToTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function EventCreatorModal(props: Props) {
  const { t } = useI18n();
  const ev = props.event;
  const isEdit = !!ev;

  const [title, setTitle] = createSignal(ev?.title ?? "");
  const [allDay, setAllDay] = createSignal(ev?.allDay ?? false);
  const [startDate, setStartDate] = createSignal(ev ? isoToDate(ev.start, ev.allDay) : (props.defaultDate ?? todayDate()));
  const [startTime, setStartTime] = createSignal(ev && !ev.allDay ? isoToTime(ev.start) : "09:00");
  const [nofinish, setNofinish] = createSignal(ev?.nofinish ?? false);
  const [endDate, setEndDate] = createSignal(ev?.end ? isoToDate(ev.end, ev.allDay) : (props.defaultDate ?? todayDate()));
  const [endTime, setEndTime] = createSignal(ev?.end && !ev.allDay ? isoToTime(ev.end) : "10:00");
  const [location, setLocation] = createSignal(ev?.location ?? "");
  const [description, setDescription] = createSignal(ev?.description ?? "");
  const [submitting, setSubmitting] = createSignal(false);
  const [selectedCalIdx, setSelectedCalIdx] = createSignal(0);

  const [calData] = createQueryResource("cdav-calendars", fetchCdavCalendars);

  const calendarOptions = (): CalendarOption[] => {
    const d = calData();
    const opts: CalendarOption[] = [
      {
        label: d?.channel_calendar?.displayname ?? t("calendar.channel_calendar"),
        color: d?.channel_calendar?.color ?? "#3a87ad",
      },
    ];
    if (d?.has_cdav) {
      for (const cal of d.my_calendars) {
        opts.push({ label: cal.displayname, color: cal.color, calendarId: cal.id as number, calendarInstanceId: cal.instanceId });
      }
      for (const cal of d.shared_calendars) {
        if (cal.access === "read-write") {
          opts.push({ label: cal.displayname, color: cal.color, calendarId: cal.id as number, calendarInstanceId: cal.instanceId });
        }
      }
    }
    return opts;
  };

  let titleRef!: HTMLInputElement;
  onMount(() => titleRef?.focus());

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") props.onClose();
  }
  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!title().trim()) { toast.error(t("calendar.title_required")); return; }

    setSubmitting(true);

    try {
      // All-day: send a bare UTC midnight so PHP stores the calendar date unchanged.
      // Timed: new Date("YYYY-MM-DDTHH:MM:SS") is parsed as LOCAL time by the JS
      // engine, so toISOString() gives the correct UTC equivalent.
      const startIso = allDay()
        ? `${startDate()}T00:00:00Z`
        : new Date(`${startDate()}T${startTime()}:00`).toISOString();

      const endIso = !nofinish() && endDate()
        ? allDay()
          ? `${endDate()}T00:00:00Z`
          : new Date(`${endDate()}T${endTime()}:00`).toISOString()
        : undefined;

      if (isEdit && ev) {
        await editEvent(ev.id, {
          title: title().trim(),
          description: description().trim() || undefined,
          location: location().trim() || undefined,
          start: startIso,
          end: endIso,
          allDay: allDay(),
          nofinish: nofinish(),
          calendarId: ev.calendarId,
          uri: ev.uri,
        });
        props.onEdited?.();
      } else {
        const selectedCal = calendarOptions()[selectedCalIdx()];
        await createEvent({
          title: title().trim(),
          description: description().trim() || undefined,
          location: location().trim() || undefined,
          start: startIso,
          end: endIso,
          allDay: allDay(),
          nofinish: nofinish(),
          calendarId: selectedCal?.calendarId,
          calendarInstanceId: selectedCal?.calendarInstanceId,
        });
        props.onCreated?.();
      }
      props.onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("calendar.failed_create"));
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "bg-overlay border border-rim rounded-lg px-3 py-2 text-sm text-txt " +
    "placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 w-full";

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}
    >
      <div class="bg-surface border border-rim rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-rim shrink-0">
          <h2 class="text-base font-semibold text-txt">
            {isEdit ? t("calendar.edit_event") : t("calendar.new_event")}
          </h2>
          <button
            type="button"
            onClick={props.onClose}
            class="p-1.5 rounded-lg text-muted hover:bg-elevated hover:text-txt transition-colors"
            aria-label="Close"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} class="flex-1 p-5 flex flex-col gap-4 overflow-y-auto min-h-0">

          {/* Calendar picker — only shown when creating and multiple options exist */}
          <Show when={!isEdit && calendarOptions().length > 1}>
            <div class="flex flex-col gap-1">
              <label class="text-xs font-medium text-muted">{t("calendar.calendar_label")}</label>
              <div class="relative">
                <select
                  value={selectedCalIdx()}
                  onChange={(e) => setSelectedCalIdx(parseInt(e.currentTarget.value))}
                  class={inputClass + " appearance-none pr-8 cursor-pointer"}
                >
                  <For each={calendarOptions()}>
                    {(opt, i) => (
                      <option value={i()}>{opt.label}</option>
                    )}
                  </For>
                </select>
                {/* Color dot overlay */}
                <span
                  class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
                  style={{ background: calendarOptions()[selectedCalIdx()]?.color ?? "#3a87ad" }}
                />
                <span class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </div>
          </Show>

          {/* Title */}
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted">{t("calendar.title_label")}</label>
            <input
              ref={titleRef!}
              type="text"
              required
              placeholder={t("calendar.title_placeholder") as string}
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
              class={inputClass}
            />
          </div>

          {/* All-day toggle */}
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allDay()}
              onChange={(e) => setAllDay(e.currentTarget.checked)}
              class="w-4 h-4 rounded accent-accent"
            />
            <span class="text-sm text-txt">{t("calendar.all_day")}</span>
          </label>

          {/* Start */}
          <div class="flex gap-2">
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs font-medium text-muted">{t("calendar.start_label")}</label>
              <input
                type="date"
                required
                value={startDate()}
                onInput={(e) => setStartDate(e.currentTarget.value)}
                class={inputClass}
              />
            </div>
            <Show when={!allDay()}>
              <div class="flex flex-col gap-1 w-28">
                <label class="text-xs font-medium text-muted">{t("calendar.time_label")}</label>
                <input
                  type="time"
                  value={startTime()}
                  onChange={(e) => setStartTime(e.currentTarget.value)}
                  class={inputClass}
                />
              </div>
            </Show>
          </div>

          {/* No-end toggle */}
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={nofinish()}
              onChange={(e) => setNofinish(e.currentTarget.checked)}
              class="w-4 h-4 rounded accent-accent"
            />
            <span class="text-sm text-txt">{t("calendar.no_end_time")}</span>
          </label>

          {/* End */}
          <Show when={!nofinish()}>
            <div class="flex gap-2">
              <div class="flex flex-col gap-1 flex-1">
                <label class="text-xs font-medium text-muted">{t("calendar.end_label")}</label>
                <input
                  type="date"
                  value={endDate()}
                  onInput={(e) => setEndDate(e.currentTarget.value)}
                  class={inputClass}
                />
              </div>
              <Show when={!allDay()}>
                <div class="flex flex-col gap-1 w-28">
                  <label class="text-xs font-medium text-muted">{t("calendar.time_label")}</label>
                  <input
                    type="time"
                    value={endTime()}
                    onChange={(e) => setEndTime(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
              </Show>
            </div>
          </Show>

          {/* Location */}
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted">{t("calendar.location_label")}</label>
            <input
              type="text"
              placeholder={t("calendar.optional") as string}
              value={location()}
              onInput={(e) => setLocation(e.currentTarget.value)}
              class={inputClass}
            />
          </div>

          {/* Description */}
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted">{t("calendar.description_label")}</label>
            <textarea
              placeholder={t("calendar.optional") as string}
              rows={3}
              value={description()}
              onInput={(e) => setDescription(e.currentTarget.value)}
              class={`${inputClass} resize-none`}
            />
          </div>

          {/* Actions */}
          <div class="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={props.onClose}
              class="px-4 py-1.5 rounded-lg text-xs font-medium text-muted hover:bg-elevated hover:text-txt transition-colors"
            >
              {t("calendar.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting()}
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent text-accent-fg
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting()
                ? (isEdit ? t("calendar.saving") : t("calendar.creating"))
                : (isEdit ? t("calendar.save_event") : t("calendar.create_event"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
