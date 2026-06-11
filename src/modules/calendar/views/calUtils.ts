import type { CalEvent } from "../api";

export const HOUR_H = 56; // px per hour in time grid

export function isoDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ISO datetime → local-timezone YYYY-MM-DD. Use for timed events to stay consistent with isoDateStr(anchor). */
export function localDay(iso: string): string {
  return isoDateStr(new Date(iso));
}

export function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function todayKey(): string {
  return isoDateStr(new Date());
}

export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function weeksForMonth(year: number, month: number): string[][] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - start.getDay());

  const weeks: string[][] = [];
  const cur = new Date(start);
  while (cur <= lastDay) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(isoDateStr(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export interface SpanEv {
  event: CalEvent;
  startCol: number;
  endCol: number;
  startsBefore: boolean;
  endsAfter: boolean;
}

/** Subtract one calendar day from a YYYY-MM-DD string using UTC arithmetic. */
function prevDay(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Lay out events for a week.
 *
 * - Spanning (multi-day) events go into `lanes` for the banner / overlay bars.
 * - Single-day events go into `singleDay` for per-cell pill rendering (MonthView).
 *
 * `allInLanes = true` puts every event into `lanes`, even single-day ones —
 * used by WeekView so all-day events appear in the banner regardless of span.
 */
export function weekLayout(weekDates: string[], events: CalEvent[], allInLanes = false) {
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const spanning: SpanEv[] = [];
  const singleDay = new Map<string, CalEvent[]>();

  for (const ev of events) {
    // All-day events: use UTC date slice (they have no meaningful tz offset).
    // Timed events: use local-timezone date so they match weekDates (local strings).
    const evS = ev.allDay ? ev.start.slice(0, 10) : localDay(ev.start);
    let evE = ev.end
      ? (ev.allDay ? ev.end.slice(0, 10) : localDay(ev.end))
      : evS;

    // CalDAV all-day events follow RFC 5545 and use exclusive DTEND (next day).
    // Channel all-day events use inclusive DTEND (same day). Normalize to inclusive.
    if (ev.allDay && ev.end && evE > evS) {
      evE = prevDay(evE);
    }

    if (evE < weekStart || evS > weekEnd) continue;

    const sc = evS < weekStart ? 0 : weekDates.indexOf(evS);
    const ec = evE > weekEnd ? 6 : weekDates.indexOf(evE);
    const safeEc = ec < 0 ? 6 : ec;
    const safeSc = sc < 0 ? 0 : sc;
    const startsBefore = evS < weekStart;
    const endsAfter = evE > weekEnd;

    if (allInLanes || safeSc < safeEc || startsBefore || endsAfter) {
      spanning.push({ event: ev, startCol: safeSc, endCol: safeEc, startsBefore, endsAfter });
    } else {
      const key = weekDates[safeSc];
      if (key) {
        if (!singleDay.has(key)) singleDay.set(key, []);
        singleDay.get(key)!.push(ev);
      }
    }
  }

  spanning.sort((a, b) => a.startCol - b.startCol || (b.endCol - b.startCol) - (a.endCol - a.startCol));

  const lanes: SpanEv[][] = [];
  for (const ev of spanning) {
    let placed = false;
    for (const lane of lanes) {
      if (!lane.some(e => e.endCol >= ev.startCol && e.startCol <= ev.endCol)) {
        lane.push(ev); placed = true; break;
      }
    }
    if (!placed) lanes.push([ev]);
  }

  return { lanes, singleDay };
}

export function eventTopPx(isoStart: string): number {
  const d = new Date(isoStart);
  return (d.getHours() + d.getMinutes() / 60) * HOUR_H;
}

export function eventHeightPx(isoStart: string, isoEnd: string | null): number {
  if (!isoEnd) return HOUR_H;
  const dur = (new Date(isoEnd).getTime() - new Date(isoStart).getTime()) / 3_600_000;
  return Math.max(HOUR_H / 4, dur * HOUR_H);
}

export interface TimedEv {
  event: CalEvent;
  col: number;
  totalCols: number;
}

export function columnLayout(events: CalEvent[]): TimedEv[] {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const slotEnds: number[] = [];

  const items: TimedEv[] = sorted.map(ev => {
    const st = new Date(ev.start).getTime();
    const et = ev.end ? new Date(ev.end).getTime() : st + 3_600_000;
    let col = slotEnds.findIndex(e => e <= st);
    if (col === -1) col = slotEnds.length;
    slotEnds[col] = et;
    return { event: ev, col, totalCols: 1 };
  });

  for (const item of items) {
    const st = new Date(item.event.start).getTime();
    const et = item.event.end ? new Date(item.event.end).getTime() : st + 3_600_000;
    let max = item.col;
    for (const other of items) {
      const os = new Date(other.event.start).getTime();
      const oe = other.event.end ? new Date(other.event.end).getTime() : os + 3_600_000;
      if (os < et && oe > st) max = Math.max(max, other.col);
    }
    item.totalCols = max + 1;
  }
  return items;
}
