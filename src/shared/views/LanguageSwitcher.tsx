import { useI18n, LOCALES, type Locale } from "@/i18n/index";
import { createSignal, For, Show, onCleanup } from "solid-js";

const LanguageSwitcher = () => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = createSignal(false);

  const current = () => LOCALES.find((l) => l.value === locale());

  const handleSelect = (value: Locale) => {
    setLocale(value);
    setOpen(false);
  };

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
        title="Language"
        class={`p-2 rounded-lg transition-colors text-muted hover:bg-elevated hover:text-txt
          ${open() ? "bg-elevated text-txt" : ""}`}
      >
        <span class="text-base leading-none">{current()?.flag ?? "🌐"}</span>
      </button>

      <Show when={open()}>
        <div class="absolute bottom-full left-0 mb-1 z-50 w-44
                    bg-surface border border-rim rounded-lg shadow-lg overflow-hidden">
          <div class="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted border-b border-rim">
            Language
          </div>
          <div class="py-1">
            <For each={LOCALES}>
              {(l) => (
                <button
                  onClick={() => handleSelect(l.value)}
                  class={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors
                    ${locale() === l.value
                      ? "bg-elevated text-txt font-medium"
                      : "text-muted hover:bg-elevated hover:text-txt"
                    }`}
                >
                  <span class="text-base leading-none">{l.flag}</span>
                  <span>{l.label}</span>
                  <Show when={locale() === l.value}>
                    <svg class="w-3.5 h-3.5 ml-auto shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default LanguageSwitcher;
