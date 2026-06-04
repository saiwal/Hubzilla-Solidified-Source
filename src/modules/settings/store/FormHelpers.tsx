// settings/store/FormHelpers.tsx
import { Show } from "solid-js";

export function SaveBar(props: { saving: boolean }) {
  return (
    <div class="flex items-center gap-3 pt-2 border-t border-rim">
      <button
        type="submit"
        disabled={props.saving}
        class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
               hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
      >
        {props.saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

export function Section(props: { title: string; children: any }) {
  return (
    <div class="space-y-3">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-muted">{props.title}</h3>
      <div class="space-y-2.5">{props.children}</div>
    </div>
  );
}

export function Field(props: { label: string; hint?: string; children: any }) {
  return (
    <div class="space-y-1.5">
      <label class="block text-sm font-medium text-txt">{props.label}</label>
      {props.children}
      <Show when={props.hint}>
        <p class="text-xs text-muted">{props.hint}</p>
      </Show>
    </div>
  );
}

export function Toggle(props: { name: string; label: string; hint?: string; checked: boolean }) {
  return (
    <label class="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        name={props.name}
        value="1"
        checked={props.checked}
        class="mt-0.5 h-4 w-4 rounded border-rim accent-accent cursor-pointer"
      />
      <span class="flex-1 min-w-0">
        <span class="block text-sm text-txt">{props.label}</span>
        <Show when={props.hint}>
          <span class="block text-xs text-muted">{props.hint}</span>
        </Show>
      </span>
    </label>
  );
}

export const inputClass = `w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt text-sm
  placeholder:text-muted hover:border-rim-strong focus:outline-none
  focus:border-rim-strong transition-colors`;
