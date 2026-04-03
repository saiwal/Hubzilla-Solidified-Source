import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";

// ── SettingRow ────────────────────────────────────────────────────────────────
// Mirrors the flex justify-between pattern from the existing SettingsView.
export const SettingRow: Component<{
  label: string;
  hint?: string;
  children: JSX.Element;
}> = (props) => (
  <div class="flex items-center justify-between gap-4 py-1">
    <div class="flex flex-col gap-0.5">
      <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {props.label}
      </span>
      <Show when={props.hint}>
        <span class="text-xs text-zinc-400 dark:text-zinc-500">{props.hint}</span>
      </Show>
    </div>
    {props.children}
  </div>
);

// ── FieldSelect ───────────────────────────────────────────────────────────────
export const fieldSelectClass =
  "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500";

export const fieldInputClass =
  "w-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400";

// ── Toggle ────────────────────────────────────────────────────────────────────
// Hidden checkbox; visually a pill toggle. Submits as "1"/"0" in FormData.
export const Toggle: Component<{
  name: string;
  checked: boolean; // initial checked state from server data
  label: string;
  hint?: string;
}> = (props) => {
  return (
    <SettingRow label={props.label} hint={props.hint}>
      <label class="relative inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          name={props.name}
          // We need to submit 1/0, not "on"/absent.
          // Use a hidden companion input trick: the checkbox carries the visual
          // state but we rely on a controlled approach via a signal.
          class="sr-only peer"
          checked={props.checked}
          value="1"
        />
        {/* Hidden input always present so FormData gets 0 when unchecked */}
        <input type="hidden" name={props.name} value="0" />
        <div class="w-10 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 peer-checked:bg-zinc-900 dark:peer-checked:bg-zinc-100 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white dark:after:bg-zinc-900 after:transition-transform peer-checked:after:translate-x-5" />
      </label>
    </SettingRow>
  );
};

// ── SectionDivider ────────────────────────────────────────────────────────────
export const SectionDivider: Component<{ label: string }> = (props) => (
  <div class="pt-2 pb-1">
    <p class="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
      {props.label}
    </p>
  </div>
);

// ── SaveFooter ────────────────────────────────────────────────────────────────
export const SaveFooter: Component<{
  saving: boolean;
  saveOk: boolean;
  saveError: string | null;
}> = (props) => (
  <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
    <button
      type="submit"
      disabled={props.saving}
      class="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50 transition-opacity"
    >
      {props.saving ? "Saving…" : "Save changes"}
    </button>
    <Show when={props.saveOk}>
      <span class="text-sm text-green-600 dark:text-green-400">Saved ✓</span>
    </Show>
    <Show when={props.saveError}>
      <span class="text-sm text-red-500">{props.saveError}</span>
    </Show>
  </div>
);
