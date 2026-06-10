import { getCsrfToken } from "@/shared/lib/csrf";

export interface CdavCalendar {
  id: number | "channel_calendar";
  instanceId?: number;
  uri?: string;
  displayname: string;
  color: string;
  editable?: boolean;
  enabled: boolean;
  exportUrl: string;
  sharees?: CdavSharee[];
  // shared calendars only
  sharer?: string;
  access?: "read" | "read-write";
}

export interface CdavSharee {
  name: string;
  hash: string;
  access: number; // 2=read, 3=read-write
}

export interface CdavWritableCalendar {
  id: number;
  instanceId: number;
  displayname: string;
}

export interface LocalChannel {
  name: string;
  hash: string;
}

export interface CdavCalendarsData {
  has_cdav: boolean;
  channel_calendar: CdavCalendar;
  my_calendars: CdavCalendar[];
  shared_calendars: CdavCalendar[];
  writable_calendars: CdavWritableCalendar[];
  local_channels: LocalChannel[];
}

export async function fetchCdavCalendars(): Promise<CdavCalendarsData> {
  const res = await fetch("/api/cal/calendars", { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load calendars: ${res.status}`);
  const json = await res.json();
  return json.data as CdavCalendarsData;
}

async function cdavPost(path: string, body: object): Promise<unknown> {
  const token = await getCsrfToken();
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err?.error?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()).data;
}

export async function createCdavCalendar(name: string, color: string) {
  return cdavPost("/api/cal/calendar/create", { name, color });
}

export async function toggleCdavCalendar(id: number | "channel_calendar", enabled: boolean) {
  const numericId = id === "channel_calendar" ? 0 : id;
  return cdavPost(`/api/cal/calendar/${numericId}/toggle`, { enabled });
}

export async function editCdavCalendar(id: number, instanceId: number, name: string, color: string) {
  return cdavPost(`/api/cal/calendar/${id}/edit`, { instanceId, name, color });
}

export async function deleteCdavCalendar(id: number, instanceId: number) {
  return cdavPost(`/api/cal/calendar/${id}/delete`, { instanceId });
}

export async function shareCdavCalendar(id: number, instanceId: number, shareeHash: string, access: 2 | 3) {
  return cdavPost(`/api/cal/calendar/${id}/share`, { instanceId, shareeHash, access });
}

export async function unshareCdavCalendar(id: number, instanceId: number, shareeHash: string) {
  return cdavPost(`/api/cal/calendar/${id}/unshare`, { instanceId, shareeHash });
}
