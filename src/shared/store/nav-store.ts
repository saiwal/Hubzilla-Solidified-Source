// shared/store/nav-store.ts
//
// Singleton resource — fetched once at boot, shared across the app.
// Provides the raw NavApiResponse plus derived helpers.

import { createResource } from "solid-js";
// import { useLocation } from "@solidjs/router";
import { fetchNavApi, type NavApiResponse, type NavApp } from "../lib/nav-api";

// ── Resource ──────────────────────────────────────────────────────────────────

const [navData] = createResource<NavApiResponse>(
  () => fetchNavApi(),
  // No initialValue intentionally — callers guard with navData.loading
);

export function useNavData() {
  return navData;
}

// ── Derived: pinned apps as a flat list ───────────────────────────────────────

export function usePinnedApps(): () => NavApp[] {
  return () => navData()?.pinned ?? [];
}

export function useFeaturedApps(): () => NavApp[] {
  return () => navData()?.featured ?? [];
}

// ── Derived: channel tabs, re-fetched reactively when nick changes ─────────────
//
// Channel tabs are permission-dependent on the subject nick, so we need a
// separate fetch when the nick in the URL changes.

export function useChannelTabs(nick: () => string | undefined) {
  const [tabs] = createResource(nick, (n) =>
    n ? fetchNavApi(n).then((r) => r.channel_tabs) : Promise.resolve([])
  );
  return tabs;
}

// ── Derived: viewer ───────────────────────────────────────────────────────────

export function useNavViewer() {
  return () => navData()?.viewer;
}

export function useNavActions() {
  return () => navData()?.actions ?? {};
}
