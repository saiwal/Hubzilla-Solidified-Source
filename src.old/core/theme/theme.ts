import { createSignal, createEffect } from "solid-js";

type Theme = "light" | "dark";

const getInitialTheme = (): Theme => {
  const stored = localStorage.getItem("theme") as Theme | null;

  if (stored) return stored;

  // fallback to system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const [theme, setTheme] = createSignal<Theme>(getInitialTheme());

createEffect(() => {
  const value = theme();

  document.documentElement.classList.toggle("dark", value === "dark");
  localStorage.setItem("theme", value);
});

export function useTheme() {
  return {
    theme,
    setTheme,
    toggle: () =>
      setTheme(theme() === "dark" ? "light" : "dark"),
  };
}
