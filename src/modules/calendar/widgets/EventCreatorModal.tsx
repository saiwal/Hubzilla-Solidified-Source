import { createSignal, Show, onMount, onCleanup } from "solid-js";
import { toast } from "@/shared/store/toast";
import { createEvent } from "../api";

interface Props {
  onClose: () => void;
  onCreated?: () => void;
  defaultDate?: string; // YYYY-MM-DD, pre-fills start date
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function EventCreatorModal(props: Props) {
  const [title, setTitle] = createSignal("");
  const [allDay, setAllDay] = createSignal(false);
  const [startDate, setStartDate] = createSignal(props.defaultDate ?? todayDate());
  const [startTime, setStartTime] = createSignal("09:00");
  const [nofinish, setNofinish] = createSignal(false);
  const [endDate, setEndDate] = createSignal(props.defaultDate ?? todayDate());
  const [endTime, setEndTime] = createSignal("10:00");
  const [location, setLocation] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);

  let titleRef!: HTMLInputElement;
  onMount(() => titleRef?.focus());

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") props.onClose();
  }
  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!title().trim()) { toast.error("Title is required"); return; }

    setSubmitting(true);

    try {
      const startIso = allDay()
        ? `${startDate()}T00:00:00Z`
        : `${startDate()}T${startTime()}:00Z`;

      const endIso = !nofinish() && endDate()
        ? allDay()
          ? `${endDate()}T00:00:00Z`
          : `${endDate()}T${endTime()}:00Z`
        : undefined;

      await createEvent({
        title: title().trim(),
        description: description().trim() || undefined,
        location: location().trim() || undefined,
        start: startIso,
        end: endIso,
        allDay: allDay(),
        nofinish: nofinish(),
      });

      props.onCreated?.();
      props.onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event");
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
      <div class="bg-surface border border-rim rounded-2xl shadow-xl w-full max-w-md flex flex-col">

        {/* Header */}
        <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-rim shrink-0">
          <h2 class="text-base font-semibold text-txt">New Event</h2>
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
        <form onSubmit={handleSubmit} class="p-5 flex flex-col gap-4 overflow-y-auto">

          {/* Title */}
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted">Title *</label>
            <input
              ref={titleRef!}
              type="text"
              required
              placeholder="Event title"
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
            <span class="text-sm text-txt">All day</span>
          </label>

          {/* Start */}
          <div class="flex gap-2">
            <div class="flex flex-col gap-1 flex-1">
              <label class="text-xs font-medium text-muted">Start *</label>
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
                <label class="text-xs font-medium text-muted">Time</label>
                <input
                  type="time"
                  value={startTime()}
                  onInput={(e) => setStartTime(e.currentTarget.value)}
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
            <span class="text-sm text-txt">No end time</span>
          </label>

          {/* End */}
          <Show when={!nofinish()}>
            <div class="flex gap-2">
              <div class="flex flex-col gap-1 flex-1">
                <label class="text-xs font-medium text-muted">End</label>
                <input
                  type="date"
                  value={endDate()}
                  onInput={(e) => setEndDate(e.currentTarget.value)}
                  class={inputClass}
                />
              </div>
              <Show when={!allDay()}>
                <div class="flex flex-col gap-1 w-28">
                  <label class="text-xs font-medium text-muted">Time</label>
                  <input
                    type="time"
                    value={endTime()}
                    onInput={(e) => setEndTime(e.currentTarget.value)}
                    class={inputClass}
                  />
                </div>
              </Show>
            </div>
          </Show>

          {/* Location */}
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted">Location</label>
            <input
              type="text"
              placeholder="Optional"
              value={location()}
              onInput={(e) => setLocation(e.currentTarget.value)}
              class={inputClass}
            />
          </div>

          {/* Description */}
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-muted">Description</label>
            <textarea
              placeholder="Optional"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting()}
              class="px-4 py-1.5 rounded-lg text-xs font-semibold bg-accent text-accent-fg
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {submitting() ? "Creating…" : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
