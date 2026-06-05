import { createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminQueueworker } from "../../api";
import { useI18n } from "@/i18n";

export default function QueueworkerSection() {
  const { t } = useI18n();
  const [jobs, { refetch }] = createResource(fetchAdminQueueworker);

  return (
    <SubPageContent title={t("admin.queueworker_title")} description={t("admin.queueworker_desc")}>
      <Show when={jobs()} fallback={<Skeleton />}>
        {(list) => (
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm text-muted">{list().length} {t("admin.jobs")}</p>
              <button
                onClick={refetch}
                class="px-3 py-1.5 text-xs rounded-lg border border-rim text-txt hover:bg-elevated transition-colors"
              >
                {t("admin.refresh")}
              </button>
            </div>

            <Show when={list().length === 0}>
              <p class="text-sm text-muted py-4 text-center">{t("admin.no_jobs")}</p>
            </Show>

            <Show when={list().length > 0}>
              <div class="rounded-lg border border-rim overflow-x-auto">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b border-rim bg-elevated">
                      <th class="px-3 py-2 text-left font-medium text-muted">{t("admin.col_id")}</th>
                      <th class="px-3 py-2 text-left font-medium text-muted">{t("admin.col_priority")}</th>
                      <th class="px-3 py-2 text-left font-medium text-muted hidden sm:table-cell">{t("admin.col_created")}</th>
                      <th class="px-3 py-2 text-left font-medium text-muted hidden md:table-cell">{t("admin.col_command")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={list()}>
                      {(job) => (
                        <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                          <td class="px-3 py-2 text-txt font-mono">{job.id}</td>
                          <td class="px-3 py-2 text-muted">{job.priority}</td>
                          <td class="px-3 py-2 text-muted hidden sm:table-cell">{new Date(job.created).toLocaleString()}</td>
                          <td class="px-3 py-2 text-muted hidden md:table-cell truncate max-w-[16rem]">{job.argv}</td>
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

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      <div class="h-4 w-24 rounded bg-elevated" />
      <div class="rounded-lg border border-rim overflow-hidden">
        {Array.from({ length: 4 }, () => (
          <div class="h-8 border-b border-rim bg-elevated/30 last:border-0" />
        ))}
      </div>
    </div>
  );
}
