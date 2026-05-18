// src/modules/cal/api.ts

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
