import { Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { apiFetch } from "@/shared/lib/fetch";
import { useSectionForm } from "../../store/useSectionForm";
import { SaveBar, Group, SwitchRow } from "../../store/FormHelpers";
import { useI18n } from "@/i18n";
import { MdOutlineTune } from "solid-icons/md";

interface PrivacyData {
  autoperms: number;
  index_opt_out: number;
  permit_all_mentions: number;
  moderate_unsolicited_comments: number;
  ocap_enabled: number;
}

async function fetchPrivacy(): Promise<PrivacyData> {
  const res = await apiFetch("/spa/settings/privacy");
  const { data } = await res.json();
  return data;
}

async function savePrivacy(payload: Partial<PrivacyData>): Promise<void> {
  const res = await apiFetch("/spa/settings/privacy", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error?.message ?? "Save failed");
  }
}

// Permission limits and the group-actor flag live in the channel section
// (custom role only, edited via the permission-limits modal there).
const TOGGLE_FIELDS = [
  "autoperms", "index_opt_out",
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

  return (
    <SubPageContent title={t("settings.title_privacy")} description={t("settings.desc_privacy")}>
      <Show when={data()} fallback={<Skeleton />}>
        <form onSubmit={handleSubmit} class="space-y-5">

          <Group
            icon={<MdOutlineTune size={18} />}
            title={t("settings.privacy_advanced")}
            desc={t("settings.privacy_advanced_desc")}
          >
            <SwitchRow name="autoperms"                     label={t("settings.privacy_autoperms")}         hint={t("settings.privacy_autoperms_hint")}         checked={!!data()!.autoperms} />
            <SwitchRow name="permit_all_mentions"           label={t("settings.privacy_permit_mentions")}   hint={t("settings.privacy_permit_mentions_hint")}   checked={!!data()!.permit_all_mentions} />
            <SwitchRow name="moderate_unsolicited_comments" label={t("settings.privacy_moderate_comments")} hint={t("settings.privacy_moderate_comments_hint")} checked={!!data()!.moderate_unsolicited_comments} />
            <SwitchRow name="index_opt_out"                 label={t("settings.privacy_index_opt_out")}     hint={t("settings.privacy_index_opt_out_hint")}     checked={!!data()!.index_opt_out} />
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
      {[...Array(1)].map(() => (
        <div class="rounded-xl border border-rim bg-surface">
          <div class="flex items-center gap-3 px-4 py-3 border-b border-rim">
            <div class="h-8 w-8 rounded-lg bg-elevated" />
            <div class="space-y-1.5">
              <div class="h-3.5 w-36 rounded bg-elevated" />
              <div class="h-3 w-52 rounded bg-elevated" />
            </div>
          </div>
          <div class="px-4 py-2 space-y-3">
            {[...Array(5)].map(() => (
              <div class="flex items-center justify-between gap-4">
                <div class="h-3.5 w-48 rounded bg-elevated" />
                <div class="h-6 w-11 rounded-full bg-elevated" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
