import { createSignal, For, Show, onCleanup } from "solid-js";
import { useTheme } from "../lib/useTheme";
import { THEMES } from "../types/theme.types";
import { BiRegularPalette } from "solid-icons/bi";

const ThemeToggle = () => {
  const { theme, switchTheme } = useTheme();
  const [open, setOpen] = createSignal(false);

  let ref: HTMLDivElement | undefined;
  const onDocClick = (e: MouseEvent) => {
    if (ref && !ref.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener("click", onDocClick);
  onCleanup(() => document.removeEventListener("click", onDocClick));

  return (
    <div ref={ref} class="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        title="Theme"
        class={`p-2 rounded-lg transition-colors text-muted hover:bg-elevated hover:text-txt
          ${open() ? "bg-elevated text-txt" : ""}`}
      >
        <BiRegularPalette size={18} />
      </button>

      <Show when={open()}>
        <div class="absolute bottom-full left-0 mb-1 z-50 w-44
                    bg-surface border border-rim rounded-lg shadow-lg overflow-hidden">
          <div class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted border-b border-rim">
            Theme
          </div>
          <div class="py-1 max-h-72 overflow-y-auto">
            <For each={THEMES}>
              {(t) => (
                <button
                  onClick={() => { switchTheme(t.id); setOpen(false); }}
                  class={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-left transition-colors
                    ${theme() === t.id
                      ? "bg-elevated text-txt font-medium"
                      : "text-muted hover:bg-elevated hover:text-txt"
                    }`}
                >
                  {t.label}
                  <Show when={theme() === t.id}>
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ThemeToggle;
