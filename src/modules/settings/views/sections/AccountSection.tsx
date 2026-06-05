import { Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAccountSettings } from "../../api/api";
import { useSectionForm } from "../../store/useSectionForm";
import { useI18n } from "@/i18n";

export default function AccountSection() {
  const { t } = useI18n();
  const { data, saving, handleSubmit } = useSectionForm({
    fetcher: fetchAccountSettings,
    saver: async () => {}, // account email change not yet wired in PHP
  });

  return (
    <SubPageContent title={t("settings.title_account")} description={t("settings.desc_account")}>
      <Show when={data()} fallback={<Skeleton />}>
        <form onSubmit={handleSubmit} class="space-y-6">
          <Field label={t("settings.email")}>
            <input
              type="email"
              name="email"
              value={data()!.$email}
              class="w-full max-w-sm px-3 py-2 rounded-lg border border-rim bg-surface
                     text-txt hover:border-rim-strong focus:outline-none
                     focus:border-rim-strong transition-colors text-sm"
            />
          </Field>

          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving()}
              class="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-accent-fg
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {saving() ? t("settings.saving") : t("settings.save")}
            </button>
          </div>
        </form>
      </Show>
    </SubPageContent>
  );
}

function Field(props: { label: string; hint?: string; children: any }) {
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

function Skeleton() {
  return (
    <div class="space-y-5 animate-pulse">
      <div class="h-3.5 w-32 rounded bg-elevated" />
      <div class="h-9 w-64 rounded-lg bg-elevated" />
    </div>
  );
}
