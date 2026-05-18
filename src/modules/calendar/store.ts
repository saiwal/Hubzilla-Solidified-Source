// src/modules/cal/store.ts
//
// Module-level singleton — survives navigation.
// Guard loadCalendar() with events().length === 0 only when the nick hasn't
// changed; a nick change always triggers a fresh fetch.

import { createSignal } from "solid-js";
import { fetchEvents } from "./api";
import type { CalEvent, CalRange } from "./api";

// ── nick ──────────────────────────────────────────────────────────────────────
const [nick, setNick] = createSignal("");
export { nick };

// ── event list ────────────────────────────────────────────────────────────────
const [events, setEvents] = createSignal<CalEvent[]>([]);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal<string | null>(null);

export { events, loading, error };

// ── current range (drives the "month" the user is viewing) ───────────────────
const [range, setRange] = createSignal<CalRange | undefined>(undefined);
export { range };

// ── selected event (detail panel) ────────────────────────────────────────────
const [selectedEvent, setSelectedEvent] = createSignal<CalEvent | null>(null);
export { selectedEvent, setSelectedEvent };

// ── actions ───────────────────────────────────────────────────────────────────

export function resetCal() {
  setEvents([]);
  setError(null);
  setRange(undefined);
  setSelectedEvent(null);
}

/**
 * Load events for `nickname`, optionally within a date range.
 * Always resets when the nick changes.
 */
export async function loadCalendar(
  nickname: string,
  newRange?: CalRange,
): Promise<void> {
  const nickChanged = nickname !== nick();

  // Avoid re-fetching the same nick + range pair
  if (
    !nickChanged &&
    events().length > 0 &&
    rangesEqual(newRange, range())
  ) {
    return;
  }

  if (nickChanged) {
    setNick(nickname);
    setEvents([]);
    setSelectedEvent(null);
  }

  setRange(newRange);
  setLoading(true);
  setError(null);

  try {
    const data = await fetchEvents(nickname, newRange);
    setEvents(data);
  } catch (e) {
    setError(e instanceof Error ? e.message : "Failed to load calendar");
  } finally {
    setLoading(false);
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

function rangesEqual(a?: CalRange, b?: CalRange): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.start === b.start && a.end === b.end;
}

/**
 * Derive the month boundaries (YYYY-MM-DD) for a given year/month.
 * Feed these into loadCalendar() to drive month navigation.
 */
export function monthRange(year: number, month: number): CalRange {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month, 1)); // exclusive: first day of NEXT month
  return {
    start: start.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
  };
}
