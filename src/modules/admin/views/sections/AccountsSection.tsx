import { createSignal, createResource, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminAccounts, adminAccountAction } from "../../api";
import type { AdminAccount } from "../../types";
import { useI18n } from "@/i18n";

export default function AccountsSection() {
  const { t } = useI18n();
  const [page, setPage] = createSignal(0);
  const [result, { refetch }] = createResource(page, fetchAdminAccounts);

  async function act(account_id: number, action: "block" | "unblock" | "delete") {
    if (action === "delete" && !confirm(t("admin.delete_confirm"))) return;
    await adminAccountAction(account_id, action);
    refetch();
  }

  return (
    <SubPageContent title={t("admin.accounts_title")} description={t("admin.accounts_desc")}>
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
                    <th class="px-3 py-2 text-left text-xs font-medium text-muted">{t("admin.col_email")}</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden sm:table-cell">{t("admin.col_channels")}</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden md:table-cell">{t("admin.col_created")}</th>
                    <th class="px-3 py-2 text-left text-xs font-medium text-muted">{t("admin.col_status")}</th>
                    <th class="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  <For each={r().data}>
                    {(acc) => (
                      <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                        <td class="px-3 py-2 text-txt truncate max-w-[12rem]">{acc.account_email}</td>
                        <td class="px-3 py-2 text-muted hidden sm:table-cell">{acc.channels || "—"}</td>
                        <td class="px-3 py-2 text-muted hidden md:table-cell">{fmtDate(acc.account_created)}</td>
                        <td class="px-3 py-2">
                          <Show when={Number(acc.blocked) > 0}>
                            <span class="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              {t("admin.blocked_badge")}
                            </span>
                          </Show>
                        </td>
                        <td class="px-3 py-2">
                          <AccountActions account={acc} onAct={act} />
                        </td>
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

function AccountActions(props: {
  account: AdminAccount;
  onAct: (id: number, action: "block" | "unblock" | "delete") => void;
}) {
  const { t } = useI18n();
  const isBlocked = () => Number(props.account.blocked) > 0;
  return (
    <div class="flex items-center gap-1.5">
      <button
        onClick={() => props.onAct(props.account.account_id, isBlocked() ? "unblock" : "block")}
        class="px-2 py-1 text-xs rounded border border-rim text-txt hover:bg-elevated transition-colors"
      >
        {isBlocked() ? t("admin.unblock") : t("admin.block")}
      </button>
      <button
        onClick={() => props.onAct(props.account.account_id, "delete")}
        class="px-2 py-1 text-xs rounded border border-red-300 text-red-600
               hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
        {t("admin.delete")}
      </button>
    </div>
  );
}

function fmtDate(s: string) {
  if (!s) return "—";
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
