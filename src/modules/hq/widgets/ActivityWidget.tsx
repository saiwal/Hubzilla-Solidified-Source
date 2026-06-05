import { useI18n } from "@/i18n";

export default function ActivityWidget() {
  const { t } = useI18n();

  return (
    <div class="space-y-4">
      <h2 class="font-semibold text-sm text-muted uppercase tracking-wide">
        {t("hq.activity")}
      </h2>
      <ul class="space-y-3 text-sm">
        <li class="text-muted">Alice created a ticket</li>
        <li class="text-muted">Bob closed #204</li>
        <li class="text-muted">Deploy succeeded</li>
      </ul>
    </div>
  );
}
