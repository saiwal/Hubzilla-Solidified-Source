import { createSignal, For, Show } from "solid-js";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminAccounts, adminAccountAction, adminPendingAction } from "../../api";
import type { AdminAccount } from "../../types";
import { useI18n } from "@/i18n";

export default function AccountsSection() {
  const { t } = useI18n();
  const [page, setPage] = createSignal(0);
  const [result, { refetch }] = createQueryResource("admin-accounts", page, fetchAdminAccounts);

  async function act(account_id: number, action: "block" | "unblock" | "delete") {
    if (action === "delete" && !confirm(t("admin.delete_confirm"))) return;
    await adminAccountAction(account_id, action);
    refetch();
  }

  async function pendingAct(reg_id: number, action: "approve" | "deny") {
    try {
      await adminPendingAction(reg_id, action);
      refetch();
    } catch (e) {
      alert(String((e as Error)?.message ?? e));
    }
  }

  return (
    <SubPageContent title={t("admin.accounts_title")} description={t("admin.accounts_desc")} wide>
      <Show when={result.error}>
        <div class="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400 mb-4">
          Error: {String(result.error?.message ?? result.error)}
        </div>
      </Show>

      <Show when={result()} fallback={<Skeleton />}>
        {(r) => (
          <div class="space-y-6">

            {/* ── Pending registrations ── */}
            <Show when={r().pending?.length > 0}>
              <section class="space-y-3">
                <h3 class="text-sm font-semibold text-txt flex items-center gap-2">
                  Pending registrations
                  <span class="px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                    {r().pending.length}
                  </span>
                </h3>

                <div class="rounded-lg border border-rim overflow-x-auto">
                  <table class="w-full text-sm table-fixed">
                    <colgroup>
                      <col class="w-auto" />
                      <col class="hidden sm:table-column sm:w-32" />
                      <col class="hidden md:table-column md:w-32" />
                      <col class="w-32" />
                      <col class="w-40" />
                    </colgroup>
                    <thead>
                      <tr class="border-b border-rim bg-elevated">
                        <th class="px-3 py-2 text-left text-xs font-medium text-muted">Email</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden sm:table-cell">Requested</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden md:table-cell">IP</th>
                        <th class="px-3 py-2 text-left text-xs font-medium text-muted">Status</th>
                        <th class="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      <For each={r().pending}>
                        {(reg) => (
                          <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                            <td class="px-3 py-2 text-txt truncate">{reg.reg_email}</td>
                            <td class="px-3 py-2 text-muted hidden sm:table-cell">{fmtDate(reg.reg_created)}</td>
                            <td class="px-3 py-2 text-muted font-mono text-xs hidden md:table-cell">{reg.reg_atip || "—"}</td>
                            <td class="px-3 py-2">
                              <div class="flex flex-wrap gap-1">
                                <Show when={reg.unverified}>
                                  <span class="px-1.5 py-0.5 text-xs rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    Unverified
                                  </span>
                                </Show>
                                <Show when={reg.expired}>
                                  <span class="px-1.5 py-0.5 text-xs rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                    Expired
                                  </span>
                                </Show>
                              </div>
                            </td>
                            <td class="px-3 py-2">
                              <div class="flex items-center gap-1.5">
                                <button
                                  onClick={() => pendingAct(reg.reg_id, "approve")}
                                  class="px-2 py-1 text-xs rounded border border-green-300 text-green-700
                                         hover:bg-green-50 dark:border-green-700 dark:text-green-400
                                         dark:hover:bg-green-900/20 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => pendingAct(reg.reg_id, "deny")}
                                  class="px-2 py-1 text-xs rounded border border-red-300 text-red-600
                                         hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  Deny
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </section>
            </Show>

            {/* ── Account list ── */}
            <section class="space-y-3">
              <p class="text-sm text-muted">
                {r().meta.root_count === 0
                  ? "No accounts"
                  : `Showing ${r().meta.offset + 1}–${r().meta.offset + r().data.length} of ${r().meta.root_count}`}
              </p>

              <div class="rounded-lg border border-rim overflow-x-auto">
                <table class="w-full text-sm table-fixed">
                  <colgroup>
                    <col class="w-auto" />
                    <col class="hidden sm:table-column sm:w-28" />
                    <col class="hidden md:table-column md:w-28" />
                    <col class="hidden lg:table-column lg:w-28" />
                    <col class="w-28" />
                    <col class="w-40" />
                  </colgroup>
                  <thead>
                    <tr class="border-b border-rim bg-elevated">
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted">{t("admin.col_email")}</th>
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden sm:table-cell">{t("admin.col_channels")}</th>
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden md:table-cell">{t("admin.col_created")}</th>
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted hidden lg:table-cell">Last login</th>
                      <th class="px-3 py-2 text-left text-xs font-medium text-muted">{t("admin.col_status")}</th>
                      <th class="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    <For each={r().data}>
                      {(acc) => (
                        <tr class="border-b border-rim last:border-0 hover:bg-elevated/50 transition-colors">
                          <td class="px-3 py-2 text-txt truncate">{acc.account_email}</td>
                          <td class="px-3 py-2 text-muted hidden sm:table-cell truncate">{acc.channels || "—"}</td>
                          <td class="px-3 py-2 text-muted hidden md:table-cell">{fmtDate(acc.account_created)}</td>
                          <td class="px-3 py-2 text-muted hidden lg:table-cell">{fmtDate(acc.account_lastlog)}</td>
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
            </section>

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
  if (!s || s === "0001-01-01 00:00:00") return "—";
  try {
    return new Date(s).toLocaleDateString();
  } catch {
    return "—";
  }
}

function Skeleton() {
  return (
    <div class="space-y-4 animate-pulse">
      <div class="space-y-2">
        <div class="h-4 w-48 rounded bg-elevated" />
        <div class="rounded-lg border border-rim overflow-hidden">
          {Array.from({ length: 3 }, () => (
            <div class="h-10 border-b border-rim bg-elevated/30 last:border-0" />
          ))}
        </div>
      </div>
      <div class="space-y-2">
        <div class="h-4 w-40 rounded bg-elevated" />
        <div class="rounded-lg border border-rim overflow-hidden">
          {Array.from({ length: 5 }, () => (
            <div class="h-10 border-b border-rim bg-elevated/30 last:border-0" />
          ))}
        </div>
      </div>
    </div>
  );
}
