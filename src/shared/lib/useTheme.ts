import { createSignal, onMount } from "solid-js";
import type { ThemeId } from "../types/theme.types";

const [theme, setTheme] = createSignal<ThemeId>("light");

const DARK_THEMES = new Set<ThemeId>([
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

function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
  document.documentElement.classList.toggle("dark", DARK_THEMES.has(id));
}

export function useTheme() {
  onMount(() => {
    const stored = localStorage.getItem("color-scheme") as ThemeId | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const resolved: ThemeId = stored ?? (prefersDark ? "dark" : "light");
    setTheme(resolved);
    applyTheme(resolved);
  });

  const switchTheme = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    localStorage.setItem("color-scheme", id);
  };

  return { theme, switchTheme };
}
