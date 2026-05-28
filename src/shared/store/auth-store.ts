import { createResource } from "solid-js";
import { applyTypography, type FontSize, type FontFamily } from "../lib/typography";
import { initBackground, type BgFit } from "../lib/background";
import { initTheme } from "../lib/useTheme";
import { THEMES, type ThemeId } from "../types/theme.types";

export type AuthState = {
  isLocal: boolean; // true = native logged-in user
  isLoggedIn: boolean; // true = any authenticated user (local or remote)
  isAdmin: boolean; // true = is administrator
  nick: string; // channel nick, "" if anonymous
  uid: number; // local channel id, 0 for visitors/anonymous
  pageSize: number;
	updateInterval: number;
};

const ANONYMOUS: AuthState = {
  isLocal: false,
  isLoggedIn: false,
  isAdmin: false,
  nick: "",
  uid: 0,
  pageSize: 10,
	updateInterval: 60,
};

function channelNickFromUrl(): string {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] === "channel" && parts[1] ? parts[1] : "";
}

async function fetchAuthState(): Promise<AuthState> {
  const urlNick = channelNickFromUrl();
  const url = urlNick ? `/api/pconfig?channel=${encodeURIComponent(urlNick)}` : "/api/pconfig";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) return ANONYMOUS;
  const json = await res.json();
  if (json.error) return ANONYMOUS;
  const data = json.data ?? {};

  const isAdmin = data.is_admin ?? false;
  const nick = data.channel ?? "";
  const uid = Number(data.uid ?? 0);
  // No is_local field — if uid > 0 and channel is set, it's a local user
  const isLocal = uid > 0 && nick !== "";

  if (data.spa) {
    const validSizes   = new Set(["small", "medium", "large", "xl"]);
    const validFits    = new Set(["tile", "cover"]);
    const validFamilies = new Set([
      "system","serif","monospace","nunito","playfair","comfortaa",
      "space-mono","pacifico","righteous","comic","opendyslexic",
    ]);

    const sz  = data.spa.font_size   ?? "";
    const fam = data.spa.font_family ?? "";
    if (validSizes.has(sz) || validFamilies.has(fam)) {
      applyTypography(
        (validSizes.has(sz)    ? sz  : "medium") as FontSize,
        (validFamilies.has(fam) ? fam : "system") as FontFamily,
      );
    }

    // Only update background from server when the key is explicitly present —
    // an absent bg_url means the user has no server-side background saved yet,
    // and we should not clobber whatever is in localStorage.
    if ("bg_url" in data.spa) {
      const bgUrl = data.spa.bg_url ?? "";
      const bgFit = data.spa.bg_fit ?? "cover";
      initBackground(bgUrl, (validFits.has(bgFit) ? bgFit : "cover") as BgFit);
    }

    const validThemes = new Set(THEMES.map((t) => t.id));
    const serverTheme = data.spa.color_scheme ?? "";
    if (validThemes.has(serverTheme)) {
      initTheme(serverTheme as ThemeId, data.spa.custom_theme_colors ?? undefined);
    }
  }

  return {
    isLocal,
    isLoggedIn: nick !== "",
    isAdmin,
    nick,
    uid,
    pageSize: parseInt(data.system?.itemspage ?? "10", 10),
    updateInterval: parseInt(data.system?.update_interval ?? "60000", 10),
  };
}
// Singleton resource — fetched once at boot, shared across the app
const [authState] = createResource<AuthState>(fetchAuthState, {
  // initialValue: ANONYMOUS,
});

export function useAuth() {
  return authState;
}

// Convenience derived helpers
export function isLocalUser() {
  return authState()?.isLocal ?? false;
}
export function isAdmin() {
  return authState()?.isAdmin ?? false;
}
export function isLoggedIn() {
  return authState()?.isLoggedIn ?? false;
}

export function currentNick() {
  return authState()?.nick ?? "";
}
export function pageSize(): number {
  return authState()?.pageSize ?? 10;
}
export function updateInterval(): number{
	return authState()?.updateInterval ?? 60000;
}
