import { Show } from "solid-js";
import { useSectionForm } from "../store/useSectionForm";
import { fetchPrivacySettings, savePrivacySettings } from "../api/api";
import { SettingRow, SaveFooter, fieldSelectClass } from "../views/Primitives";

export default function PrivacySection() {
  const { data, saving, saveError, saveOk, handleSubmit } = useSectionForm({
    fetcher: fetchPrivacySettings,
    saver: savePrivacySettings,
    numericFields: ["show_online_status", "index_by_search", "show_profile_to_visitors"],
  });

  return (
    <Show when={data()} fallback={<p class="text-sm text-zinc-400">Loading…</p>}>
      {(s) => (
        <form onSubmit={handleSubmit} class="space-y-4">
          <SettingRow label="Default post visibility">
            <select name="default_post_visibility" class={fieldSelectClass}>
              <option value="public" selected={s().default_post_visibility === "public"}>
                Public
              </option>
              <option value="connections" selected={s().default_post_visibility === "connections"}>
                Connections only
              </option>
              <option value="self" selected={s().default_post_visibility === "self"}>
                Only me
              </option>
            </select>
          </SettingRow>

          <SettingRow label="Show online status" hint="Let connections see when you're active">
            <select name="show_online_status" class={fieldSelectClass}>
              <option value="1" selected={s().show_online_status === 1}>Yes</option>
              <option value="0" selected={s().show_online_status === 0}>No</option>
            </select>
          </SettingRow>

          <SettingRow label="Allow search indexing" hint="Appear in directory and search">
            <select name="index_by_search" class={fieldSelectClass}>
              <option value="1" selected={s().index_by_search === 1}>Yes</option>
              <option value="0" selected={s().index_by_search === 0}>No</option>
            </select>
          </SettingRow>

          <SettingRow
            label="Public profile"
            hint="Show your profile to unauthenticated visitors"
          >
            <select name="show_profile_to_visitors" class={fieldSelectClass}>
              <option value="1" selected={s().show_profile_to_visitors === 1}>Yes</option>
              <option value="0" selected={s().show_profile_to_visitors === 0}>No</option>
            </select>
          </SettingRow>

          <SaveFooter saving={saving()} saveOk={saveOk()} saveError={saveError()} />
        </form>
      )}
    </Show>
  );
}
