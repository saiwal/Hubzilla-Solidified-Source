import { createSignal } from "solid-js";
import type { ThemeId } from "../types/theme.types";
import { apiFetch } from "./fetch";

const STORAGE_KEY = "hz-theme";

export const DARK_THEMES = new Set<ThemeId>([
  "dark",
  "nord",
  "dracula",
  "monokai",
  "gruvbox-dark",
  "catppuccin-mocha",
  "solarized-dark",
  "tokyo-night",
  "one-dark",
  "cyberpunk",
  "matrix",
  "rose-pine",
]);

const [theme, setTheme] = createSignal<ThemeId>(
  (localStorage.getItem(STORAGE_KEY) as ThemeId) ?? "light"
);

export function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
  document.documentElement.classList.toggle("dark", DARK_THEMES.has(id));
}

/** Called by auth-store to sync the signal with the server value (no server round-trip). */
export function initTheme(id: ThemeId) {
  setTheme(id);
  applyTheme(id);
  localStorage.setItem(STORAGE_KEY, id);
}

export function useTheme() {
  const switchTheme = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    localStorage.setItem(STORAGE_KEY, id);
    apiFetch("/api/settings/display", {
      method: "POST",
      body: JSON.stringify({ color_scheme: id }),
    }).catch(() => {});
  };

  return { theme, switchTheme };
}
