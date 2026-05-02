import { apiFetch } from "@/shared/lib/fetch";
import type { AccountSettings, DisplaySettings, NotificationSettings } from "../store/types";

// ── Display ──────────────────────────────────────────────────────────────────
export type { DisplaySettings };

export async function fetchDisplaySettings(): Promise<DisplaySettings> {
  const res = await apiFetch("/api/settings/display");
  const { data } = await res.json();
	return data;
}

export async function saveDisplaySettings(data: Partial<DisplaySettings>): Promise<void> {
  const res = await apiFetch("/api/settings/display", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "Save failed");
  }
}

// ── Account ──────────────────────────────────────────────────────────────────

export async function fetchAccountSettings(): Promise<AccountSettings> {
  const res = await apiFetch("/api/settings/account");
  const { data } = await res.json();
  return data;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const res = await apiFetch("/api/settings/notifications");
  const { data } = await res.json();
  return data;
}

export async function saveNotificationSettings(data: Partial<NotificationSettings>): Promise<void> {
  const res = await apiFetch("/api/settings/notifications", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "Save failed");
  }
}
