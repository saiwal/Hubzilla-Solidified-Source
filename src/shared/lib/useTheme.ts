import { createSignal } from "solid-js";
import type { ThemeId, CustomThemeColors } from "../types/theme.types";
import { apiFetch } from "./fetch";

const STORAGE_KEY = "hz-theme";
const CUSTOM_COLORS_KEY = "hz-custom-theme";

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
  "high-contrast",
]);

export const DEFAULT_CUSTOM_COLORS: CustomThemeColors = {
  base: "#1e1e2e",
  txt: "#cdd6f4",
  accent: "#cba6f7",
  isDark: true,
};

function loadCustomColorsFromStorage(): CustomThemeColors {
  try {
    const stored = localStorage.getItem(CUSTOM_COLORS_KEY);
    if (stored) return { ...DEFAULT_CUSTOM_COLORS, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CUSTOM_COLORS;
}

const [theme, setTheme] = createSignal<ThemeId>(
  (localStorage.getItem(STORAGE_KEY) as ThemeId) ?? "light"
);

const [customColors, setCustomColors] = createSignal<CustomThemeColors>(
  loadCustomColorsFromStorage()
);

export function buildCustomThemeCSS(colors: CustomThemeColors): string {
  const { base, txt, accent, isDark } = colors;
  const w = isDark ? "white" : "black";
  const b = isDark ? "black" : "white";

  return `[data-theme="custom"] {
  --color-base: ${base};
  --color-surface: color-mix(in srgb, ${base}, ${w} 8%);
  --color-elevated: color-mix(in srgb, ${base}, ${w} 18%);
  --color-overlay: color-mix(in srgb, ${base}, ${b} 8%);
  --color-txt: ${txt};
  --color-muted: color-mix(in srgb, ${txt}, ${base} 50%);
  --color-subtle: color-mix(in srgb, ${txt}, ${base} 70%);
  --color-rim: color-mix(in srgb, ${txt}, ${base} 78%);
  --color-rim-strong: color-mix(in srgb, ${txt}, ${base} 68%);
  --color-accent: ${accent};
  --color-accent-muted: color-mix(in srgb, ${accent}, ${base} 82%);
  --color-accent-txt: color-mix(in srgb, ${accent}, ${w} 15%);
  --color-accent-fg: #ffffff;
}`;
}

function injectCustomThemeStyle(colors: CustomThemeColors) {
  let styleEl = document.getElementById("hz-custom-theme") as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "hz-custom-theme";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = buildCustomThemeCSS(colors);
}

export function applyCustomThemeColors(colors: CustomThemeColors) {
  injectCustomThemeStyle(colors);
  document.documentElement.setAttribute("data-theme", "custom");
  document.documentElement.classList.toggle("dark", colors.isDark);
}

export function applyTheme(id: ThemeId) {
  if (id === "custom") {
    applyCustomThemeColors(loadCustomColorsFromStorage());
    return;
  }
  document.documentElement.setAttribute("data-theme", id);
  document.documentElement.classList.toggle("dark", DARK_THEMES.has(id));
}

export function initTheme(id: ThemeId, customColorsJson?: string) {
  setTheme(id);
  if (id === "custom") {
    let colors = loadCustomColorsFromStorage();
    if (customColorsJson) {
      try {
        const parsed = JSON.parse(customColorsJson);
        colors = { ...DEFAULT_CUSTOM_COLORS, ...parsed };
        setCustomColors(colors);
        localStorage.setItem(CUSTOM_COLORS_KEY, customColorsJson);
      } catch {}
    }
    applyCustomThemeColors(colors);
  } else {
    applyTheme(id);
  }
  localStorage.setItem(STORAGE_KEY, id);
}

export function useTheme() {
  const switchTheme = (id: ThemeId) => {
    setTheme(id);
    if (id === "custom") {
      applyCustomThemeColors(customColors());
    } else {
      applyTheme(id);
    }
    localStorage.setItem(STORAGE_KEY, id);
    apiFetch("/spa/settings/display", {
      method: "POST",
      body: JSON.stringify({ color_scheme: id }),
    }).catch(() => {});
  };

  const updateCustomColors = (colors: CustomThemeColors) => {
    setCustomColors(colors);
    const json = JSON.stringify(colors);
    localStorage.setItem(CUSTOM_COLORS_KEY, json);
    if (theme() === "custom") {
      applyCustomThemeColors(colors);
    }
    apiFetch("/spa/settings/display", {
      method: "POST",
      body: JSON.stringify({ color_scheme: "custom", custom_theme_colors: json }),
    }).catch(() => {});
  };

  return { theme, switchTheme, customColors, updateCustomColors };
}
