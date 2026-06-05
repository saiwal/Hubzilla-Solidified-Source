import { Show, For } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";
import { useSectionForm } from "../../store/useSectionForm";
import { SaveBar, Toggle, Section } from "../../store/FormHelpers";
import { useI18n } from "@/i18n";

interface PermRow {
  key: string;
  label: string;
  value: number;
  help: string;
  options: Record<string, string>;
}

interface PrivacyData {
  permission_limits: boolean;
  permiss_arr: [string, string, number, string, Record<string, string>][];
  autoperms: number;
  index_opt_out: number;
  group_actor: number;
  permit_all_mentions: number;
  moderate_unsolicited_comments: number;
  ocap_enabled: number;
}

async function fetchPrivacy(): Promise<PrivacyData> {
  const res = await apiFetch("/api/settings/privacy");
  const { data } = await res.json();
  return data;
}

async function savePrivacy(payload: Partial<PrivacyData>): Promise<void> {
  const res = await apiFetch("/api/settings/privacy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message ?? "Save failed");
  }
}

const TOGGLE_FIELDS = [
  "autoperms", "index_opt_out", "group_actor",
  "permit_all_mentions", "moderate_unsolicited_comments", "ocap_enabled",
] as const;

function Skeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      {[...Array(5)].map(() => (
        <div class="space-y-1.5">
          <div class="h-3.5 w-40 rounded bg-elevated" />
          <div class="h-9 w-full max-w-xs rounded-lg bg-elevated" />
        </div>
      ))}
    </div>
  );
}

export default function PrivacySection() {
  const { t } = useI18n();
  const { data, saving, handleSubmit } = useSectionForm({
    fetcher: fetchPrivacy,
    saver: savePrivacy,
    numericFields: [...TOGGLE_FIELDS],
    checkboxFields: [...TOGGLE_FIELDS],
  });

  const perms = (): PermRow[] =>
    (data()?.permiss_arr ?? []).map(([key, label, value, help, options]) => ({
      key, label, value, help, options,
    }));

  return (
    <SubPageContent title={t("settings.title_privacy")} description={t("settings.desc_privacy")}>
      <Show when={data()} fallback={<Skeleton />}>
        <form onSubmit={handleSubmit} class="space-y-8">

          {/* Permission limits */}
          <Show when={data()!.permission_limits}>
            <Section title={t("settings.privacy_perm_limits")}>
              <For each={perms()}>
                {(perm) => (
                  <div class="space-y-1">
                    <label class="block text-sm font-medium text-txt">{perm.label}</label>
                    <select
                      name={perm.key}
                      class="w-full max-w-xs px-3 py-2 rounded-lg border border-rim bg-surface
                             text-txt text-sm hover:border-rim-strong focus:outline-none
                             focus:border-rim-strong transition-colors"
                    >
                      <For each={Object.entries(perm.options)}>
                        {([val, label]) => (
                          <option value={val} selected={Number(val) === perm.value}>
                            {label}
                          </option>
                        )}
                      </For>
                    </select>
                    <Show when={perm.help}>
                      <p class="text-xs text-muted">{perm.help}</p>
                    </Show>
                  </div>
                )}
              </For>
            </Section>
          </Show>

          {/* Toggles */}
          <Section title={t("settings.privacy_advanced")}>
            <Toggle name="autoperms"                     label={t("settings.privacy_autoperms")}              hint={t("settings.privacy_autoperms_hint")}           checked={!!data()!.autoperms} />
            <Toggle name="permit_all_mentions"           label={t("settings.privacy_permit_mentions")}        hint={t("settings.privacy_permit_mentions_hint")}     checked={!!data()!.permit_all_mentions} />
            <Toggle name="moderate_unsolicited_comments" label={t("settings.privacy_moderate_comments")}      hint={t("settings.privacy_moderate_comments_hint")}   checked={!!data()!.moderate_unsolicited_comments} />
            <Toggle name="index_opt_out"                 label={t("settings.privacy_index_opt_out")}          hint={t("settings.privacy_index_opt_out_hint")}       checked={!!data()!.index_opt_out} />
            <Toggle name="group_actor"                   label={t("settings.privacy_group_actor")}                                                                  checked={!!data()!.group_actor} />
            <Toggle name="ocap_enabled"                  label={t("settings.privacy_ocap")}                   hint={t("settings.privacy_ocap_hint")}               checked={!!data()!.ocap_enabled} />
          </Section>

          <SaveBar saving={saving()} />
        </form>
      </Show>
    </SubPageContent>
  );
}
