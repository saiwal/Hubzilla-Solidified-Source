import { createResource, createSignal, Show, For } from "solid-js";
import { fetchDisplaySettings, saveDisplaySettings } from "./api";

export default function Settings() {
  const [settings, { refetch }] = createResource(fetchDisplaySettings);
  const [saving, setSaving] = createSignal(false);

  async function handleSave(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form));
    setSaving(true);
    try {
      await saveDisplaySettings({
				theme:           String(data.theme),
        thread_allow:    Number(data.thread_allow),
        itemspage:       Number(data.itemspage),
        update_interval: Number(data.update_interval),
        no_smilies:      Number(data.no_smilies),
        title_tosource:  Number(data.title_tosource),
        start_menu:      Number(data.start_menu),
        user_scalable:   Number(data.user_scalable),
      });
      refetch();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div class="max-w-2xl mx-auto p-6">
      <h1 class="text-2xl font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
        Display Settings
      </h1>

      <Show when={settings()} fallback={<p class="text-zinc-500">Loading...</p>}>
        {(s) => (
          <form onSubmit={handleSave} class="space-y-6">
						<div class="flex items-center justify-between">
							<label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
								Display Theme
							</label>
							<select
								name="theme"
								class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm"
							>
								<For each={s().themes}>
									{(t) => (
										<option value={t} selected={s().theme === t}>
											{t}
										</option>
									)}
								</For>
							</select>
						</div>
            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Threaded conversations
              </label>
              <select name="thread_allow"
                class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm">
                <option value="1" selected={s().thread_allow === 1}>Yes</option>
                <option value="0" selected={s().thread_allow === 0}>No</option>
              </select>
            </div>

            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Items per page
              </label>
              <input type="number" name="itemspage"
                value={s().itemspage} min="1" max="30"
                class="w-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm" />
            </div>

            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Browser update interval (seconds)
              </label>
              <input type="number" name="update_interval"
                value={s().update_interval} min="10"
                class="w-20 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm" />
            </div>

            <div class="flex items-center justify-between">
              <label class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Show smilies as images
              </label>
              <select name="no_smilies"
                class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm">
                <option value="0" selected={s().no_smilies === 0}>Yes</option>
                <option value="1" selected={s().no_smilies === 1}>No</option>
              </select>
            </div>

            <div class="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <button type="submit" disabled={saving()}
                class="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50">
                {saving() ? "Saving..." : "Save Settings"}
              </button>
            </div>

          </form>
        )}
      </Show>
    </div>
  );
}

