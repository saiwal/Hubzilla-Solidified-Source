import { createResource, createEffect } from "solid-js";
import { applyBackgroundCSS, loadBackground, type BgFit } from "./background";
import { applyTheme } from "./useTheme";
import { THEMES, type ThemeId } from "../types/theme.types";

const VALID_FITS  = new Set<string>(["tile", "cover"]);
const VALID_THEMES = new Set(THEMES.map((t) => t.id));

async function fetchChannelSpa(nick: string): Promise<Record<string, string> | null> {
  if (!nick) return null;
  const res = await fetch(`/api/pconfig?channel=${encodeURIComponent(nick)}`, {
    credentials: "include",
  });
  if (!res.ok) return null;
  const json = await res.json();
  const data = json.data ?? json;
  // Logged-in users get page_spa (visited channel's prefs); anonymous get spa
  return data.page_spa ?? (data.uid === 0 ? data.spa : null);
}

/**
 * Reactively applies the visited channel's color scheme and background image.
 * Pass the result of useSubjectNick() — reacts whenever the channel changes.
 * When nick becomes "" (non-channel pages), reverts to the user's own saved settings.
 */
export function useChannelTheme(channelNick: () => string) {
  const [channelSpa] = createResource(channelNick, fetchChannelSpa);

  createEffect(() => {
    const spa = channelSpa();
    if (spa === undefined) return; // still loading

    if (spa === null) {
      // Left channel pages — restore user's own settings from localStorage
      loadBackground();
      applyTheme(((localStorage.getItem("hz-theme") ?? "light") as ThemeId));
      return;
    }

    // Apply the channel's background (CSS only — do not overwrite user's localStorage)
    const bgUrl = spa.bg_url ?? "";
    const bgFit = (VALID_FITS.has(spa.bg_fit ?? "") ? spa.bg_fit : "cover") as BgFit;
    applyBackgroundCSS(bgUrl, bgFit);

    // Apply the channel's color scheme (CSS only — do not overwrite user's localStorage)
    const scheme = spa.color_scheme ?? "";
    if (VALID_THEMES.has(scheme as ThemeId)) {
      applyTheme(scheme as ThemeId);
    }
  });
}
