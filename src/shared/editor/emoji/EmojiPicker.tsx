/**
 * EmojiPicker.tsx
 * Standalone emoji picker with search — no external dropdown dependencies.
 */

import { createSignal, createMemo, For, Show, onMount, onCleanup, createEffect } from "solid-js";
import { getEmojiMap, type EmojiEntry } from "@/shared/store/emoji-store";
import { useI18n } from "@/i18n";

export interface EmojiPickerProps {
  onSelect: (entry: EmojiEntry) => void;
  /** Override the trigger button's icon/label (defaults to a plain smiley glyph). */
  triggerIcon?: any;
  /** Override the trigger button's classes (defaults to the EditorToolbar Btn style). */
  triggerClass?: string;
}

export default function EmojiPicker(props: EmojiPickerProps) {
  const { t } = useI18n();
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");
  const [panelStyle, setPanelStyle] = createSignal<{ top: string; left: string; right?: string }>({
    top: "auto",
    left: "auto",
  });

  let triggerRef: HTMLButtonElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  const entries = createMemo(() => Object.values(getEmojiMap()));

  const filtered = createMemo<EmojiEntry[]>(() => {
    const q = query().trim().toLowerCase();
    if (!q) return entries();
    return entries().filter((e) => e.shortname.toLowerCase().includes(q));
  });

  const triggerClass = () =>
    props.triggerClass ??
    `px-1.5 py-0.5 rounded text-txt hover:bg-elevated transition-colors ${open() ? "bg-elevated" : ""}`;

  // Calculate panel position to avoid right edge overflow
  const updatePanelPosition = () => {
    if (!triggerRef) return;
    const triggerRect = triggerRef.getBoundingClientRect();
    const panelWidth = 256; // w-64 = 16rem = 256px
    const viewportWidth = window.innerWidth;
    const gap = 4; // mt-1 equivalent in px
    
    const top = triggerRect.bottom + gap;
    let left = triggerRect.left;
    let right: string | undefined;
    
    // If picker would overflow right edge, anchor to right instead
    if (left + panelWidth > viewportWidth - 8) {
      // Subtract from right edge with 8px padding
      right = `${8}px`;
      left = NaN as any;
    }
    
    setPanelStyle({
      top: `${top}px`,
      left: isNaN(left as any) ? "auto" : `${left}px`,
      right: right,
    });
  };

  // Handle click outside to close the picker
  const handleDocumentClick = (e: MouseEvent) => {
    if (!open()) return;
    const target = e.target as Node;
    // Keep open if clicking inside the panel or the trigger button
    if (panelRef?.contains(target) || triggerRef?.contains(target)) return;
    setOpen(false);
  };

  // Update position whenever open state changes
  createEffect(() => {
    if (open()) {
      updatePanelPosition();
    }
  });

  onMount(() => {
    document.addEventListener("click", handleDocumentClick, { capture: true });
    window.addEventListener("resize", updatePanelPosition);
  });

  onCleanup(() => {
    document.removeEventListener("click", handleDocumentClick, { capture: true });
    window.removeEventListener("resize", updatePanelPosition);
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={t("editor.emoji_picker_title")}
        onClick={() => setOpen((o) => !o)}
        class={triggerClass()}
      >
        {props.triggerIcon ?? <span class="text-xs">☺</span>}
      </button>

      <Show when={open()}>
        <div
          ref={panelRef}
          class="fixed z-50 w-64 bg-surface border border-rim rounded-xl shadow-xl overflow-hidden flex flex-col"
          style={panelStyle()}
        >
          {/* Search input */}
          <div class="p-2 border-b border-rim">
            <input
              autoFocus
              type="text"
              value={query()}
              onInput={(e) => setQuery(e.currentTarget.value)}
              placeholder={t("editor.emoji_search_placeholder")}
              class="w-full px-2 py-1 text-xs rounded-lg border border-rim bg-elevated text-txt
                     placeholder:text-muted outline-none focus:border-rim-strong transition-colors"
            />
          </div>

          {/* Emoji grid */}
          <div class="p-2 grid grid-cols-8 gap-1 max-h-56 overflow-y-auto">
            <For each={filtered()}>
              {(entry) => (
                <button
                  type="button"
                  title={entry.shortname}
                  onClick={() => {
                    props.onSelect(entry);
                    setOpen(false);
                    setQuery("");
                  }}
                  class="w-7 h-7 flex items-center justify-center rounded hover:bg-elevated transition-colors"
                >
                  <img
                    src={`/${entry.filepath}`}
                    alt={entry.shortname}
                    class="w-5 h-5 object-contain"
                  />
                </button>
              )}
            </For>
            <Show when={filtered().length === 0}>
              <span class="col-span-8 text-xs text-muted text-center py-2">
                {t("editor.emoji_no_results")}
              </span>
            </Show>
          </div>
        </div>
      </Show>
    </>
  );
}
