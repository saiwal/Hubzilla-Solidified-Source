import { For, Show } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminQueue } from "../../api";
import { useI18n } from "@/i18n";

export default function QueueSection() {
  const { t } = useI18n();
  const [data, { refetch }] = createQueryResource("admin-queue", fetchAdminQueue);

  return (
    <SubPageContent title={t("admin.queue_title")} description={t("admin.queue_desc")}>
      <Show when={data()} fallback={<Skeleton />}>
        {(d) => (
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted">
                {d().total} {d().total !== 1 ? t("admin.undelivered_pl") : t("admin.undelivered")}
                {d().items.length < d().total ? ` (${t("admin.showing")} ${d().items.length})` : ""}
              </p>
              <button
                onClick={refetch}
                class="px-3 py-1.5 text-xs rounded-lg border border-rim text-txt hover:bg-elevated transition-colors"
              >
                {t("admin.refresh")}
              </button>
            </div>

            <Show when={d().total === 0}>
              <p class="text-sm text-muted py-4 text-center">{t("admin.queue_empty")}</p>
            </Show>

            <Show when={d().items.length > 0}>
              <div class="rounded-lg border border-rim overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-rim bg-elevated">
                      <th class="px-3 py-2 text-left font-medium text-muted">{t("admin.col_destination")}</th>
                      <th class="px-3 py-2 text-left font-medium text-muted hidden sm:table-cell">{t("admin.col_updated")}</th>
                      <th class="px-3 py-2 text-left font-medium text-muted hidden md:table-cell">{t("admin.col_priority")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={d().items}>
                      {(item) => (
                        <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                          <td class="px-3 py-2 text-txt truncate max-w-[16rem]" title={item.outq_posturl}>
                            {item.outq_posturl}
                          </td>
                          <td class="px-3 py-2 text-muted hidden sm:table-cell">{fmtDate(item.outq_updated)}</td>
                          <td class="px-3 py-2 text-muted hidden md:table-cell">{item.outq_priority}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        )}
      </Show>
    </SubPageContent>
  );
}

function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      <div class="h-4 w-40 rounded bg-elevated" />
      <div class="rounded-lg border border-rim overflow-hidden">
        {Array.from({ length: 5 }, () => (
          <div class="h-8 border-b border-rim bg-elevated/30 last:border-0" />
        ))}
      </div>
    </div>
  );
}
