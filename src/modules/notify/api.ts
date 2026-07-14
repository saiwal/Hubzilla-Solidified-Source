// src/modules/notify/api.ts
import { apiFetch } from "@/shared/lib/fetch";

export async function resolveNotify(id: string): Promise<{ link: string }> {
  const res = await apiFetch(`/api/notify/${id}`);
  if (!res.ok) throw new Error(`Failed to resolve notification (${res.status})`);
  const json = await res.json();
  return json.data as { link: string };
}

export interface NotificationEntry {
  notify_id?: number;
  notify_link?: string;
  name?: string;
  photo?: string;
  when?: string;
  message?: string;
  seen?: boolean;
  b64mid?: string;
}

export async function fetchNotifications(): Promise<NotificationEntry[]> {
  const res = await apiFetch("/api/notifications");
  if (!res.ok) throw new Error(`Failed to fetch notifications (${res.status})`);
  const json = await res.json();
  return (json.data ?? []) as NotificationEntry[];
}
