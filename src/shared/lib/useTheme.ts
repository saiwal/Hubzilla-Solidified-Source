import { createSignal, onMount } from "solid-js";
import type { ThemeId } from "../types/theme.types";

const [theme, setTheme] = createSignal<ThemeId>("light");

function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
  // keep the `dark` class for any legacy dark: Tailwind variants still in use
  const darkThemes: ThemeId[] = [
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
    "rose-pine",
    "pastel-soft",
    "warm-paper",
    "mint",
    "sakura",
    "latte-cream",
  ];
  document.documentElement.classList.toggle("dark", darkThemes.includes(id));
}

export function useTheme() {
  onMount(() => {
    const stored = localStorage.getItem("theme") as ThemeId | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const resolved: ThemeId = stored ?? (prefersDark ? "dark" : "light");
    setTheme(resolved);
    applyTheme(resolved);
  });

  const switchTheme = (id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    localStorage.setItem("theme", id);
  };

  return { theme, switchTheme };
}
