// shared/lib/parseEventBBCode.ts

export interface EventData {
  summary: string;
  description: string;   // may contain HTML from BBCode
  start: string;         // ISO-ish: "2026-04-23 00:00:00"
  finish: string;
  id: string;
}

const TAG = (name: string) =>
  new RegExp(`\\[${name}\\]([\\s\\S]*?)\\[\\/${name}\\]`, "i");

export function extractEventData(body: string): {
  event: EventData | null;
  remainder: string;
} {
  const summaryMatch    = body.match(TAG("event-summary"));
  const startMatch      = body.match(TAG("event-start"));

  // Must have at least summary + start to treat as event
  if (!summaryMatch || !startMatch) return { event: null, remainder: body };

  const descMatch   = body.match(TAG("event-description"));
  const finishMatch = body.match(TAG("event-finish"));
  const idMatch     = body.match(TAG("event-id"));

  const event: EventData = {
    summary:     summaryMatch[1].trim(),
    description: descMatch?.[1].trim() ?? "",
    start:       startMatch[1].trim(),
    finish:      finishMatch?.[1].trim() ?? "",
    id:          idMatch?.[1].trim() ?? "",
  };

  // Strip all event tags + the leading prose ("This event has been added…")
  const remainder = body
    .replace(/This event has been added to your calendar\.\s*/i, "")
    .replace(TAG("event-summary"), "")
    .replace(TAG("event-description"), "")
    .replace(TAG("event-start"), "")
    .replace(TAG("event-finish"), "")
    .replace(TAG("event-id"), "")
    .trim();

  return { event, remainder };
}

export function formatEventDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw.replace(" ", "T") + "Z"); // treat as UTC
  return d.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
