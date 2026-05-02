import { Show, For } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchDisplaySettings, saveDisplaySettings } from "../../api/api";
import { useSectionForm } from "../../store/useSectionForm";

export default function DisplaySection() {
  const { data, saving, saveError, saveOk, handleSubmit } = useSectionForm({
    fetcher: fetchDisplaySettings,
    saver: saveDisplaySettings,
    numericFields: [
      "update_interval", "itemspage",
      "thread_allow", "no_smilies",
      "title_tosource", "start_menu", "user_scalable",
    ],
  checkboxFields: ["thread_allow", "no_smilies", "title_tosource", "start_menu", "user_scalable"],
    reloadOn: (prev, next) => prev?.theme !== next.theme,
  });

  return (
    <SubPageContent title="Display" description="Appearance and theme preferences.">
      <Show when={data()} fallback={<FormSkeleton />}>
        <form onSubmit={handleSubmit} class="space-y-6">

          {/* Theme */}
          <Field label="Theme" hint="Requires a page reload to apply.">
            <select
              name="theme"
              class="w-full px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                     hover:border-rim-strong focus:outline-none focus:border-rim-strong
                     transition-colors text-sm"
            >
              <For each={data()!.themes}>
                {(t) => (
                  <option value={t} selected={t === data()!.theme}>
                    {t}
                  </option>
                )}
              </For>
            </select>
          </Field>

          {/* Items per page */}
          <Field
            label="Items per page"
            hint="How many posts to load at once (1–30)."
          >
            <input
              type="number"
              name="itemspage"
              min="1"
              max="30"
              value={data()!.itemspage}
              class="w-24 px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                     hover:border-rim-strong focus:outline-none focus:border-rim-strong
                     transition-colors text-sm"
            />
          </Field>

          {/* Update interval */}
          <Field
            label="Stream refresh interval (seconds)"
            hint="How often the network stream checks for new posts."
          >
            <input
              type="number"
              name="update_interval"
              min="10"
              max="3600"
              value={data()!.update_interval}
              class="w-24 px-3 py-2 rounded-lg border border-rim bg-surface text-txt
                     hover:border-rim-strong focus:outline-none focus:border-rim-strong
                     transition-colors text-sm"
            />
          </Field>

          {/* Toggles */}
          <div class="space-y-3">
            <Toggle
              name="thread_allow"
              label="Threaded view"
              hint="Show replies nested under their parent posts."
              checked={!!data()!.thread_allow}
            />
            <Toggle
              name="no_smilies"
              label="Disable smilies"
              hint="Don't convert :) and similar text into emoji images."
              checked={!!data()!.no_smilies}
            />
            <Toggle
              name="title_tosource"
              label="Post title goes to source tab"
              hint="When composing, pre-fill the BBCode source tab title."
              checked={!!data()!.title_tosource}
            />
            <Toggle
              name="user_scalable"
              label="Allow page zoom on mobile"
              checked={!!data()!.user_scalable}
            />
          </div>

          {/* Feedback + submit */}
          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving()}
              class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-txt
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed
                     transition-opacity"
            >
              {saving() ? "Saving…" : "Save changes"}
            </button>

            <Show when={saveOk()}>
              <span class="text-sm text-green-600">Saved ✓</span>
            </Show>
            <Show when={saveError()}>
              <span class="text-sm text-red-500">{saveError()}</span>
            </Show>
          </div>

        </form>
      </Show>
    </SubPageContent>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Field(props: {
  label: string;
  hint?: string;
  children: any;
}) {
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

function Toggle(props: {
  name: string;
  label: string;
  hint?: string;
  checked: boolean;
}) {
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
        <span class="block text-sm text-txt group-hover:text-txt">
          {props.label}
        </span>
        <Show when={props.hint}>
          <span class="block text-xs text-muted">{props.hint}</span>
        </Show>
      </span>
    </label>
  );
}

function FormSkeleton() {
  return (
    <div class="space-y-5 animate-pulse">
      {[...Array(4)].map(() => (
        <div class="space-y-2">
          <div class="h-3.5 w-32 rounded bg-elevated" />
          <div class="h-9 w-full max-w-xs rounded-lg bg-elevated" />
        </div>
      ))}
    </div>
  );
}
