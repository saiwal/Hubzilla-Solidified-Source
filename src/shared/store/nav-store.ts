// shared/store/nav-store.ts
//
// Nav data resource — reactive to the current channel nick.
// navData refetches whenever the subject nick changes, returning viewer info,
// pinned/featured apps, and channel_tabs all in one request.

import { createResource, createSignal } from "solid-js";
import { fetchNavApi, type NavApiResponse, type NavApp } from "../lib/nav-api";

// ── Channel nick signal ───────────────────────────────────────────────────────
//
// Initialised from the URL so the very first fetch already includes the nick.
// Layout.tsx keeps it in sync on SPA navigation via setNavNick().

function nickFromUrl(): string {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const withNick = [
    "channel", "photos", "articles", "cart", "chat",
    "calendar", "cloud", "webpages", "wiki", "cal", "page",
  ];
  return (parts[1] && withNick.includes(parts[0])) ? parts[1] : "";
}

const [navNick, setNavNick] = createSignal<string>(nickFromUrl());

export { setNavNick };

// ── Resource ──────────────────────────────────────────────────────────────────
//
// Reactive to navNick: fetches /api/nav?channel_nick=<nick> when nick is set,
// /api/nav otherwise. Includes channel_tabs in the response when nick is present.

const [navData] = createResource<NavApiResponse, string>(
  navNick,
  (nick) => fetchNavApi(nick || undefined),
);

export function useNavData() {
  return navData;
}

// ── Derived: pinned / featured apps ──────────────────────────────────────────

export function usePinnedApps(): () => NavApp[] {
  return () => navData()?.pinned ?? [];
}

export function useFeaturedApps(): () => NavApp[] {
  return () => navData()?.featured ?? [];
}

// ── Derived: channel tabs ─────────────────────────────────────────────────────
//
// Channel tabs are included in navData when channel_nick is set.
// Returns the accessor directly so callers can check .loading.

export function useChannelNav(_nick?: () => string | undefined) {
  return navData;
}

// ── Derived: viewer / actions / installed apps ────────────────────────────────

export function useNavViewer() {
  return () => navData()?.viewer;
}

export function useNavActions() {
  return () => navData()?.actions ?? {};
}

export function useInstalledApps(): () => Set<string> {
  return () => new Set(navData()?.installed_apps ?? []);
}
