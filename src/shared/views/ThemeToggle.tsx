import { For } from "solid-js";
import { useTheme } from "../lib/useTheme";
import { THEMES } from "../types/theme.types";

const ThemeToggle = () => {
  const { theme, switchTheme } = useTheme();

  return (
    <div class="flex items-center gap-1">
      <select
        value={theme()}
        onChange={(e) => switchTheme(e.currentTarget.value as any)}
        class="text-sm rounded-lg px-2 py-1.5 bg-surface text-txt border border-rim
               hover:border-rim-strong focus:outline-none transition-colors"
      >
        <For each={THEMES}>
          {(t) => <option value={t.id}>{t.label}</option>}
        </For>
      </select>
    </div>

  );
};

export default ThemeToggle;
