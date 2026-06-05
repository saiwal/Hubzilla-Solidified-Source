import { createSignal, createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminChannels } from "../../api";
import { useI18n } from "@/i18n";

export default function ChannelsSection() {
  const { t } = useI18n();
  const [page, setPage] = createSignal(0);
  const [result] = createResource(page, fetchAdminChannels);

  return (
    <SubPageContent title={t("admin.channels_title")} description={t("admin.channels_desc")}>
      <Show when={result()} fallback={<Skeleton />}>
        {(r) => (
          <div class="space-y-4">
            <p class="text-sm text-muted">
              Showing {r().meta.offset + 1}–{r().meta.offset + r().data.length} of {r().meta.root_count}
            </p>

            <div class="rounded-lg border border-rim overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-rim bg-elevated">
                    <th class="px-3 py-2 text-left text-xs font-medium text-muted">{t("admin.col_name")}</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-muted">{t("admin.col_address")}</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden md:table-cell">{t("admin.col_created")}</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden md:table-cell">{t("admin.col_last_post")}</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={r().data}>
                    {(ch) => (
                      <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                        <td class="px-3 py-2 text-txt">{ch.channel_name}</td>
                        <td class="px-3 py-2 text-muted font-mono text-xs">{ch.channel_address}</td>
                        <td class="px-3 py-2 text-muted hidden md:table-cell">{fmtDate(ch.channel_created)}</td>
                        <td class="px-3 py-2 text-muted hidden md:table-cell">{fmtDate(ch.channel_lastpost)}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>

            <div class="flex items-center gap-2">
              <button
                disabled={page() === 0}
                onClick={() => setPage((p) => p - 1)}
                class="px-3 py-1.5 text-sm rounded-lg border border-rim text-txt
                       hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("admin.page_prev")}
              </button>
              <span class="text-sm text-muted">{t("admin.page_label")} {page() + 1}</span>
              <button
                disabled={!r().meta.has_more}
                onClick={() => setPage((p) => p + 1)}
                class="px-3 py-1.5 text-sm rounded-lg border border-rim text-txt
                       hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("admin.page_next")}
              </button>
            </div>
          </div>
        )}
      </Show>
    </SubPageContent>
  );
}

function fmtDate(s: string) {
  if (!s || s === "0001-01-01 00:00:00") return "—";
  return new Date(s).toLocaleDateString();
}

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      <div class="h-4 w-40 rounded bg-elevated" />
      <div class="rounded-lg border border-rim overflow-hidden">
        {Array.from({ length: 5 }, () => (
          <div class="h-10 border-b border-rim bg-elevated/30 last:border-0" />
        ))}
      </div>
    </div>
  );
}
