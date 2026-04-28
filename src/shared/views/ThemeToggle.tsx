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
      {/* Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Theme"
        class={`p-2 rounded-lg transition-colors text-muted hover:bg-elevated hover:text-txt
          ${open() ? "bg-elevated text-txt" : ""}`}
      >
        <BiRegularPalette size={18} />
      </button>

      {/* Dropdown */}
      <Show when={open()}>
        <div
          class="absolute bottom-full left-0 mb-2 z-50 w-64
                 bg-surface border border-rim rounded-xl shadow-xl overflow-hidden"
        >
          {/* Header */}
          <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted border-b border-rim flex justify-between">
            <span>Themes</span>
            <span class="text-subtle normal-case">
              {THEMES.find((t) => t.id === theme())?.label ?? theme()}
            </span>
          </div>

          {/* Grid */}
          <div class="p-2 grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
            <For each={THEMES}>
              {(t) => {
                const active = () => theme() === t.id;

                return (
                  <button
                    onClick={() => {
                      switchTheme(t.id);
                      setOpen(false);
                    }}
                    class={`group rounded-lg border p-2 text-left transition-all
                      ${
                        active()
                          ? "border-accent bg-elevated"
                          : "border-rim hover:bg-elevated"
                      }`}
                  >
                    {/* Theme Preview (real theme applied) */}
                    <div
                      data-theme={t.id}
                      class="rounded-md border border-rim p-2 mb-1"
                    >
                      <div class="flex gap-1 mb-1">
                        <div class="w-3 h-3 rounded bg-base border border-rim"></div>
                        <div class="w-3 h-3 rounded bg-surface"></div>
                        <div class="w-3 h-3 rounded bg-elevated"></div>
                        <div class="w-3 h-3 rounded bg-accent"></div>
                      </div>

                      <div class="h-1.5 w-full rounded bg-muted/40"></div>
                    </div>

                    {/* Label */}
                    <div class="flex items-center justify-between">
                      <span class="text-xs text-txt truncate">{t.label}</span>

                      <Show when={active()}>
                        <svg
                          class="w-3.5 h-3.5 text-accent"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2.5"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </Show>
                    </div>
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default ThemeToggle;
