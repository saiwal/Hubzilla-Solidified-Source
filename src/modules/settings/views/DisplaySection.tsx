import { For, Show } from "solid-js";
import { useSectionForm } from "../store/useSectionForm";
import { fetchDisplaySettings, saveDisplaySettings } from "../api/api";
import { SettingRow, SaveFooter, fieldSelectClass, fieldInputClass } from "../views/Primitives";
import type { DisplaySettings } from "../store/types";

export default function DisplaySection() {
  const { data, saving, saveError, saveOk, handleSubmit } = useSectionForm<DisplaySettings>({
    fetcher: fetchDisplaySettings,
    saver: saveDisplaySettings,
    numericFields: [
      "thread_allow",
      "itemspage",
      "update_interval",
      "no_smilies",
      "title_tosource",
      "start_menu",
      "user_scalable",
    ],
    reloadOn: (prev, next) => prev?.theme !== next.theme,
  });

  return (
    <Show when={data()} fallback={<p class="text-sm text-zinc-400">Loading…</p>}>
      {(s) => (
        <form onSubmit={handleSubmit} class="space-y-4">
          <SettingRow label="Display theme">
            <select name="theme" class={fieldSelectClass}>
              <For each={s().themes}>
                {(t) => (
                  <option value={t} selected={s().theme === t}>
                    {t}
                  </option>
                )}
              </For>
            </select>
          </SettingRow>

          <SettingRow label="Threaded conversations">
            <select name="thread_allow" class={fieldSelectClass}>
              <option value="1" selected={s().thread_allow === 1}>Yes</option>
              <option value="0" selected={s().thread_allow === 0}>No</option>
            </select>
          </SettingRow>

          <SettingRow label="Items per page">
            <input
              type="number"
              name="itemspage"
              value={s().itemspage}
              min="1"
              max="30"
              class={fieldInputClass}
            />
          </SettingRow>

          <SettingRow label="Browser update interval" hint="seconds">
            <input
              type="number"
              name="update_interval"
              value={s().update_interval}
              min="10"
              class={fieldInputClass}
            />
          </SettingRow>

          <SettingRow label="Show smilies as images">
            <select name="no_smilies" class={fieldSelectClass}>
              <option value="0" selected={s().no_smilies === 0}>Yes</option>
              <option value="1" selected={s().no_smilies === 1}>No</option>
            </select>
          </SettingRow>

          <SettingRow label="Open links in source tab" hint="title_tosource">
            <select name="title_tosource" class={fieldSelectClass}>
              <option value="1" selected={s().title_tosource === 1}>Yes</option>
              <option value="0" selected={s().title_tosource === 0}>No</option>
            </select>
          </SettingRow>

          <SettingRow label="Start with nav menu open">
            <select name="start_menu" class={fieldSelectClass}>
              <option value="1" selected={s().start_menu === 1}>Yes</option>
              <option value="0" selected={s().start_menu === 0}>No</option>
            </select>
          </SettingRow>

          <SettingRow label="Allow page zoom on mobile">
            <select name="user_scalable" class={fieldSelectClass}>
              <option value="1" selected={s().user_scalable === 1}>Yes</option>
              <option value="0" selected={s().user_scalable === 0}>No</option>
            </select>
          </SettingRow>

          <SaveFooter saving={saving()} saveOk={saveOk()} saveError={saveError()} />
        </form>
      )}
    </Show>
  );
}
