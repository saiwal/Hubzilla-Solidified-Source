import { For, Show, createMemo } from "solid-js";
import { useTheme } from "../lib/useTheme";
import { THEMES } from "../types/theme.types";
import { BiRegularPalette } from "solid-icons/bi";
import { useDropdown } from "../lib/useDropdown";
import { Motion, Presence, scalePreset } from "../lib/motion-presets";

const ThemeToggle = () => {
  const { theme, switchTheme } = useTheme();
  const { open, toggle, floatStyle, setTriggerRef, setPanelRef } =
    useDropdown({ placement: "top-start" });

  const sortedThemes = createMemo(() =>
    [...THEMES].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    )
  );

  return (
    <>
      <button
        ref={setTriggerRef}
        onClick={toggle}
        title="Theme"
        class={`p-2 rounded-lg transition-colors text-muted hover:bg-elevated hover:text-txt
                ${open() ? "bg-elevated text-txt" : ""}`}
      >
        <BiRegularPalette size={18} />
      </button>

      <Presence>
        <Show when={open()}>
          <Motion.div
            ref={(el: HTMLDivElement) => setPanelRef(el)}
            {...scalePreset}
            style={floatStyle()}
            class="z-50 w-64 bg-surface border border-rim rounded-xl shadow-xl overflow-hidden"
          >
            <div class="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted border-b border-rim flex justify-between">
              <span>Themes</span>
              <span class="text-muted normal-case">
                {THEMES.find((t) => t.id === theme())?.label ?? theme()}
              </span>
            </div>

            <div class="p-2 grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              <For each={sortedThemes()}>
                {(t) => {
                  const active = () => theme() === t.id;
                  return (
                    <button
                      onClick={() => switchTheme(t.id)}
                      class={`rounded-lg border p-2 text-left transition-all
                              ${active() ? "border-accent bg-elevated" : "border-rim hover:bg-elevated"}`}
                    >
                      <div data-theme={t.id} class="rounded-md border border-rim p-2 mb-1">
                        <div class="flex gap-1 mb-1">
                          <div class="w-3 h-3 rounded bg-base border border-rim" />
                          <div class="w-3 h-3 rounded bg-surface" />
                          <div class="w-3 h-3 rounded bg-elevated" />
                          <div class="w-3 h-3 rounded bg-accent" />
                        </div>
                        <div class="h-1.5 w-full rounded bg-muted/40" />
                      </div>
                      <div class="flex items-center justify-between">
                        <span class="text-xs text-txt truncate">{t.label}</span>
                        <Show when={active()}>
                          <svg class="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </Show>
                      </div>
                    </button>
                  );
                }}
              </For>
            </div>
          </Motion.div>
        </Show>
      </Presence>
    </>
  );
};

export default ThemeToggle;
