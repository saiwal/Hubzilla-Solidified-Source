import { useI18n, LOCALES, type Locale} from "@/i18n/index";
import { createSignal, For, Show, onCleanup } from "solid-js";

const LanguageSwitcher = () => {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = createSignal(false);

  const current = () => LOCALES.find(l => l.value === locale());

  const handleSelect = (value: Locale) => {
    setLocale(value);
    setOpen(false);
  };

  // Close on outside click
  let ref: HTMLDivElement | undefined;
  const onDocClick = (e: MouseEvent) => {
    if (ref && !ref.contains(e.target as Node)) setOpen(false);
  };
  document.addEventListener("click", onDocClick);
  onCleanup(() => document.removeEventListener("click", onDocClick));

  return (
    <div ref={ref} class="relative mt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        class={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm
          border border-gray-200 dark:border-gray-600
          transition-colors
          ${open()
            ? "bg-gray-100 dark:bg-gray-700"
            : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
      >
        <span class="flex items-center gap-2">
          <span class="text-base leading-none">{current()?.flag}</span>
          <span>{current()?.label}</span>
        </span>
        <svg
          class={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open() ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Show when={open()}>
        <div class="absolute bottom-full left-0 right-0 mb-1 z-50
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-600
          rounded-lg overflow-hidden shadow-lg">
          <For each={LOCALES}>
            {(l) => (
              <button
                onClick={() => handleSelect(l.value)}
                class={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors
                  ${locale() === l.value
                    ? "bg-gray-100 dark:bg-gray-700 font-medium"
                    : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
              >
                <span class="text-base leading-none">{l.flag}</span>
                <span>{l.label}</span>
                <Show when={locale() === l.value}>
                  <svg class="w-4 h-4 ml-auto text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default LanguageSwitcher;
