export const THEMES = [
  { id: "light",            label: "Light" },
  { id: "dark",             label: "Dark" },
  { id: "nord",             label: "Nord" },
  { id: "dracula",          label: "Dracula" },
  { id: "monokai",          label: "Monokai" },
  { id: "gruvbox-dark",     label: "Gruvbox Dark" },
  { id: "gruvbox-light",    label: "Gruvbox Light" },
  { id: "catppuccin-latte", label: "Catppuccin Latte" },
  { id: "catppuccin-mocha", label: "Catppuccin Mocha" },
  { id: "solarized-light",  label: "Solarized Light" },
  { id: "solarized-dark",   label: "Solarized Dark" },
  { id: "tokyo-night",      label: "Tokyo Night" },
] as const;

export type ThemeId = typeof THEMES[number]["id"];
