/**
 * CategoryTagsField.tsx
 * Renders the category tag-chip row driven by useCategoryTags(). Supports
 * two visual variants via `showLabel`: Post's compact inline row (default)
 * and Article's labelled, bordered-box row.
 */

import { For, Show, type Component, type JSX } from "solid-js";

export interface CategoryTagsFieldProps {
  tags: () => string[];
  pending: () => string;
  onPendingInput: (v: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onRemove: (tag: string) => void;
  onBlur: () => void;
  placeholder: string;
  /** Article/Webpage's labelled, bordered-box look vs Post's plain inline row. Default false (Post's style). */
  showLabel?: boolean;
  label?: string;
}

const CategoryTagsField: Component<CategoryTagsFieldProps> = (props) => {
  const chips = (): JSX.Element => (
    <For each={props.tags()}>
      {(tag) => (
        <span
          class={
            props.showLabel
              ? "flex items-center gap-1 px-2 py-0.5 rounded bg-elevated text-xs text-txt"
              : "flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-elevated text-xs text-txt"
          }
        >
          {tag}
          <button
            type="button"
            onClick={() => props.onRemove(tag)}
            class="text-muted hover:text-txt leading-none"
          >
            ×
          </button>
        </span>
      )}
    </For>
  );

  const input = (): JSX.Element => (
    <input
      type="text"
      placeholder={props.tags().length ? "" : props.placeholder}
      value={props.pending()}
      onInput={(e) => props.onPendingInput(e.currentTarget.value)}
      onKeyDown={props.onKeyDown}
      onBlur={props.onBlur}
      class={
        props.showLabel
          ? "flex-1 min-w-16 bg-transparent text-sm text-txt outline-none placeholder:text-muted"
          : "flex-1 min-w-0 bg-transparent text-sm text-txt placeholder:text-muted outline-none"
      }
    />
  );

  return (
    <Show
      when={props.showLabel}
      fallback={
        <div class="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-rim shrink-0">
          {chips()}
          {input()}
        </div>
      }
    >
      <div class="flex-1 min-w-0">
        <label class="block text-xs text-muted mb-1">{props.label}</label>
        <div
          class="flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded border border-rim bg-surface
                 hover:border-rim-strong focus-within:border-rim-strong transition-colors"
        >
          {chips()}
          {input()}
        </div>
      </div>
    </Show>
  );
};

export default CategoryTagsField;
