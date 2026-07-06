import { Show, For } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";
import { useSectionForm } from "../../store/useSectionForm";
import { SaveBar, Group, SwitchRow } from "../../store/FormHelpers";
import { useI18n } from "@/i18n";
import { MdOutlineShield, MdOutlineTune } from "solid-icons/md";

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

export default function PrivacySection() {
  const { t } = useI18n();
  const { data, saving, handleSubmit } = useSectionForm({
    section: "privacy",
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
        <form onSubmit={handleSubmit} class="space-y-5">

          {/* Permission limits */}
          <Show when={data()!.permission_limits}>
            <Group
              icon={<MdOutlineShield size={18} />}
              title={t("settings.privacy_perm_limits")}
              desc={t("settings.privacy_perm_limits_desc")}
            >
              <For each={perms()}>
                {(perm) => (
                  <div class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-2.5">
                    <span class="flex-1 min-w-0">
                      <span class="block text-sm text-txt">{perm.label}</span>
                      <Show when={perm.help}>
                        <span class="block text-xs text-muted">{perm.help}</span>
                      </Show>
                    </span>
                    <select
                      name={perm.key}
                      class="w-full sm:w-60 shrink-0 px-2.5 py-1.5 rounded-lg border border-rim
                             bg-base text-txt text-sm hover:border-rim-strong focus:outline-none
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
                  </div>
                )}
              </For>
            </Group>
          </Show>

          {/* Advanced toggles */}
          <Group
            icon={<MdOutlineTune size={18} />}
            title={t("settings.privacy_advanced")}
            desc={t("settings.privacy_advanced_desc")}
          >
            <SwitchRow name="autoperms"                     label={t("settings.privacy_autoperms")}         hint={t("settings.privacy_autoperms_hint")}         checked={!!data()!.autoperms} />
            <SwitchRow name="permit_all_mentions"           label={t("settings.privacy_permit_mentions")}   hint={t("settings.privacy_permit_mentions_hint")}   checked={!!data()!.permit_all_mentions} />
            <SwitchRow name="moderate_unsolicited_comments" label={t("settings.privacy_moderate_comments")} hint={t("settings.privacy_moderate_comments_hint")} checked={!!data()!.moderate_unsolicited_comments} />
            <SwitchRow name="index_opt_out"                 label={t("settings.privacy_index_opt_out")}     hint={t("settings.privacy_index_opt_out_hint")}     checked={!!data()!.index_opt_out} />
            <SwitchRow name="group_actor"                   label={t("settings.privacy_group_actor")}                                                           checked={!!data()!.group_actor} />
            <SwitchRow name="ocap_enabled"                  label={t("settings.privacy_ocap")}              hint={t("settings.privacy_ocap_hint")}              checked={!!data()!.ocap_enabled} />
          </Group>

          <SaveBar saving={saving()} />
        </form>
      </Show>
    </SubPageContent>
  );
}

function Skeleton() {
  return (
    <div class="space-y-5 animate-pulse">
      {[...Array(2)].map(() => (
        <div class="rounded-xl border border-rim bg-surface">
          <div class="flex items-center gap-3 px-4 py-3 border-b border-rim">
            <div class="h-8 w-8 rounded-lg bg-elevated" />
            <div class="space-y-1.5">
              <div class="h-3.5 w-36 rounded bg-elevated" />
              <div class="h-3 w-52 rounded bg-elevated" />
            </div>
          </div>
          <div class="px-4 py-2 space-y-3">
            {[...Array(4)].map(() => (
              <div class="flex items-center justify-between gap-4">
                <div class="h-3.5 w-48 rounded bg-elevated" />
                <div class="h-8 w-40 rounded-lg bg-elevated" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
