// src/modules/cal/api.ts
import { getCsrfToken } from "@/shared/lib/csrf";

export interface CalEvent {
  id: number;
  uri: string;
  title: string;
  description: string;
  location: string;
  start: string;      // ISO-8601
  end: string | null; // ISO-8601 or null when nofinish
  allDay: boolean;
  nofinish: boolean;
  timezone: string;
  rw: boolean;
  plink: string;
  html: string;       // only populated for ?id= requests
  /** Set for CalDAV events — used to color-code calendar pills */
  calendarColor?: string;
  calendarName?: string;
  calendarId?: number;
  author: {
    name: string;
    avatar: string;
    url: string;
  };
}

export interface CalRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

/**
 * Fetch events for a date range (calendar feed).
 * Omit `range` to get the default upcoming-60-days window.
 */
export async function fetchEvents(
  nick: string,
  range?: CalRange,
): Promise<CalEvent[]> {
  const q = new URLSearchParams();
  if (range) {
    q.set("start", range.start);
    q.set("end", range.end);
  }
  const qs = q.toString();
  const res = await fetch(`/api/cal/${nick}${qs ? `?${qs}` : ""}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? []) as CalEvent[];
}

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  nofinish?: boolean;
  /** CalDAV calendar target. Omit (or use "channel_calendar") for the channel event table. */
  calendarId?: number;
  calendarInstanceId?: number;
}

export async function createEvent(
  input: CreateEventInput,
): Promise<{ id: number; uri: string }> {
  const token = await getCsrfToken();
  const res = await fetch("/api/cal", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as { id: number; uri: string };
}

export interface EditEventInput {
  title: string;
  description?: string;
  location?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  nofinish?: boolean;
  /** For CalDAV events — identifies the target object */
  calendarId?: number;
  uri?: string;
}

export async function editEvent(
  eventId: number,
  input: EditEventInput,
): Promise<void> {
  const token = await getCsrfToken();
  const res = await fetch(`/api/cal/${eventId}/edit`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
}

export async function deleteEvent(
  eventId: number,
  opts?: { calendarId?: number; uri?: string },
): Promise<void> {
  const token = await getCsrfToken();
  const res = await fetch(`/api/cal/${eventId}/delete`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify(opts ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
}

export interface ImportResult {
  imported: number;
  failed: number;
}

export async function importCalendar(icalContent: string): Promise<ImportResult> {
  const token = await getCsrfToken();
  const res = await fetch("/api/cal/import", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({ ical: icalContent }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as ImportResult;
}

/**
 * Fetch a single event by its numeric Hubzilla event id.
 * Returns the full event including server-rendered `html`.
 */
export async function fetchEvent(
  nick: string,
  eventId: number,
): Promise<CalEvent | null> {
  const res = await fetch(`/api/cal/${nick}?id=${eventId}`, {
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  const json = await res.json();
  const events = (json.data ?? []) as CalEvent[];
  return events[0] ?? null;
}
