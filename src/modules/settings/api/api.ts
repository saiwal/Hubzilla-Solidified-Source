import { apiFetch } from "@/shared/lib/fetch";
import type { AccountSettings, DisplaySettings, LocationEntry, NotificationSettings } from "../store/types";

// ── Display ──────────────────────────────────────────────────────────────────
export type { DisplaySettings };

export async function fetchDisplaySettings(): Promise<DisplaySettings> {
  const res = await apiFetch("/spa/settings/display");
  const { data } = await res.json();
	return data;
}

export async function saveDisplaySettings(data: Partial<DisplaySettings>): Promise<void> {
  const res = await apiFetch("/spa/settings/display", {
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
  const res = await apiFetch("/spa/settings/account");
  const { data } = await res.json();
  return data;
}

// ── Locations ────────────────────────────────────────────────────────────────

export type LocationAction = "set_primary" | "drop" | "sync";

export async function fetchLocations(): Promise<LocationEntry[]> {
  const res = await apiFetch("/spa/settings/locations");
  const { data } = await res.json();
  return data.locations as LocationEntry[];
}

export async function locationAction(action: LocationAction, id?: number): Promise<void> {
  const res = await apiFetch("/spa/settings/locations", {
    method: "POST",
    body: JSON.stringify({ action, id }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "Request failed");
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  const res = await apiFetch("/spa/settings/notifications");
  const { data } = await res.json();
  return data;
}

export async function saveNotificationSettings(data: Partial<NotificationSettings>): Promise<void> {
  const res = await apiFetch("/spa/settings/notifications", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? "Save failed");
  }
}
