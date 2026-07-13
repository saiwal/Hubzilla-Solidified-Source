/**
 * SlugField.tsx
 * Label + font-mono slug input + ↻ autofill-from-title button, shared by
 * Article and Webpage composers (Webpage previously had this button,
 * Article didn't — both now render the same component).
 */

import { type Component } from "solid-js";
import { useI18n } from "@/i18n";
import { slugify } from "../lib/slugify";

export interface SlugFieldProps {
  value: () => string;
  onInput: (v: string) => void;
  /** Source text the ↻ button derives the slug from (the composer's title signal). */
  title: () => string;
}

const SlugField: Component<SlugFieldProps> = (props) => {
  const { t } = useI18n();
  return (
    <div class="flex-1 min-w-0">
      <label class="block text-xs text-muted mb-1">{t("editor.slug_label")}</label>
      <div class="flex items-center gap-1">
        <input
          type="text"
          placeholder={t("editor.slug_placeholder")}
          value={props.value()}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          class="flex-1 px-2 py-1.5 text-sm font-mono rounded border border-rim bg-surface
                 text-txt outline-none hover:border-rim-strong focus:border-rim-strong
                 transition-colors"
        />
        <button
          type="button"
          title={t("editor.generate_slug")}
          onClick={() => props.onInput(slugify(props.title()))}
          class="px-2.5 py-1.5 rounded border border-rim text-muted hover:text-txt
                 hover:border-rim-strong transition-colors text-sm leading-none"
        >
          ↻
        </button>
      </div>
    </div>
  );
};

export default SlugField;
