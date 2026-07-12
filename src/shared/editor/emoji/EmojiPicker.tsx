/**
 * EmojiPicker.tsx
 * Toolbar button + dropdown panel for browsing/searching the full site
 * smilie set (as opposed to useEmoji's `:`-triggered 8-item autocomplete).
 */

import { createSignal, createMemo, For, Show } from "solid-js";
import { getEmojiMap, type EmojiEntry } from "@/shared/store/emoji-store";
import { useDropdown } from "@/shared/lib/useDropdown";
import { Motion, Presence, scalePreset } from "@/shared/lib/motion-presets";
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
  const [query, setQuery] = createSignal("");
  const { open, setOpen, toggle, floatStyle, setTriggerRef, setPanelRef } =
    useDropdown({ placement: "top-start" });

  const entries = createMemo(() => Object.values(getEmojiMap()));

  const filtered = createMemo<EmojiEntry[]>(() => {
    const q = query().trim().toLowerCase();
    if (!q) return entries();
    return entries().filter((e) => e.shortname.toLowerCase().includes(q));
  });

  const triggerClass = () =>
    props.triggerClass ??
    `px-1.5 py-0.5 rounded text-txt hover:bg-elevated transition-colors ${open() ? "bg-elevated" : ""}`;

  return (
    <>
      <button
        type="button"
        ref={setTriggerRef}
        title={t("editor.emoji_picker_title")}
        onMouseDown={(e) => {
          e.preventDefault();
          toggle();
        }}
        class={triggerClass()}
      >
        {props.triggerIcon ?? <span class="text-xs">☺</span>}
      </button>

      <Presence>
        <Show when={open()}>
          <Motion.div
            ref={(el: HTMLDivElement) => setPanelRef(el)}
            {...scalePreset}
            style={floatStyle()}
            class="z-50 w-64 bg-surface border border-rim rounded-xl shadow-xl overflow-hidden flex flex-col"
          >
            <div class="p-2 border-b border-rim">
              <input
                type="text"
                value={query()}
                onInput={(e) => setQuery(e.currentTarget.value)}
                placeholder={t("editor.emoji_search_placeholder")}
                class="w-full px-2 py-1 text-xs rounded-lg border border-rim bg-elevated text-txt
                       placeholder:text-muted outline-none focus:border-rim-strong transition-colors"
              />
            </div>
            <div class="p-2 grid grid-cols-8 gap-1 max-h-56 overflow-y-auto">
              <For each={filtered()}>
                {(entry) => (
                  <button
                    type="button"
                    title={entry.shortname}
                    onMouseDown={(e) => {
                      e.preventDefault();
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
          </Motion.div>
        </Show>
      </Presence>
    </>
  );
}
