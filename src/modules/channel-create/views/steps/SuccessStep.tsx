import { useI18n } from "@/i18n";

export default function SuccessStep(props: { name: string; nick: string }) {
  const { t } = useI18n();

  return (
    <div class="text-center space-y-4 py-4">
      <div class="text-4xl">🎉</div>
      <h2 class="text-lg font-semibold text-txt">
        {t("channel_create.success_title", { name: props.name })}
      </h2>
      <p class="text-sm text-muted">{t("channel_create.success_desc")}</p>

      <div class="flex flex-col gap-2 pt-2 max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => (window.location.href = "/hq")}
          class="w-full py-2.5 px-4 rounded-lg bg-accent text-accent-fg font-medium text-sm
                 hover:opacity-90 active:opacity-80 transition-opacity"
        >
          {t("channel_create.success_go_hq")}
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = "/settings/profile")}
          class="w-full py-2.5 px-4 rounded-lg border border-rim text-txt font-medium text-sm
                 hover:bg-elevated transition-colors"
        >
          {t("channel_create.success_edit_profile")}
        </button>
      </div>
    </div>
  );
}
