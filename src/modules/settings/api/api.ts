import { moduleGet, modulePost } from "@/shared/lib/api";
import type { DisplaySettings, PrivacySettings, NotificationSettings } from "../store/types";

// ── Display ──────────────────────────────────────────────────────────────────
export type { DisplaySettings, PrivacySettings, NotificationSettings };

export async function fetchDisplaySettings(): Promise<DisplaySettings> {
  return moduleGet<DisplaySettings>("settings/display?format=json");
}

export async function saveDisplaySettings(data: Partial<DisplaySettings>): Promise<void> {
  await modulePost("settings?format=json", data);
}

// ── Privacy ───────────────────────────────────────────────────────────────────
export async function fetchPrivacySettings(): Promise<PrivacySettings> {
  return moduleGet<PrivacySettings>("settings/privacy?format=json");
}

export async function savePrivacySettings(data: Partial<PrivacySettings>): Promise<void> {
  await modulePost("settings/privacy?format=json", data);
}

// ── Notifications ─────────────────────────────────────────────────────────────
export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  return moduleGet<NotificationSettings>("settings/notifications?format=json");
}

export async function saveNotificationSettings(data: Partial<NotificationSettings>): Promise<void> {
  await modulePost("settings/notifications?format=json", data);
}
