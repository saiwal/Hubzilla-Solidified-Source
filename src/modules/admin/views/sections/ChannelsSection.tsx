import { createSignal, createResource, createMemo, For, Show } from "solid-js";
import SubPageContent from "@/shared/views/SubPageContent";
import { fetchAdminChannels, adminChannelAction } from "../../api";
import type { AdminChannel } from "../../types";
import { useI18n } from "@/i18n";

export default function ChannelsSection() {
  const { t } = useI18n();
  const [page, setPage] = createSignal(0);
  const [search, setSearch] = createSignal("");
  const [result, { refetch }] = createResource(page, fetchAdminChannels);

  const filtered = createMemo(() => {
    const q = search().toLowerCase().trim();
    const data = result()?.data ?? [];
    if (!q) return data;
    return data.filter(
      (ch) =>
        ch.channel_name.toLowerCase().includes(q) ||
        ch.channel_address.toLowerCase().includes(q),
    );
  });

  async function act(
    channel_id: number,
    action: "block" | "unblock" | "allowcode" | "disallowcode" | "delete",
  ) {
    if (action === "delete" && !confirm(t("admin.delete_confirm"))) return;
    await adminChannelAction(channel_id, action);
    refetch();
  }

  return (
    <SubPageContent title={t("admin.channels_title")} description={t("admin.channels_desc")}>
      <Show when={result.error}>
        <div class="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Error: {String(result.error?.message ?? result.error)}
        </div>
      </Show>

      <Show when={result()} fallback={<Skeleton />}>
        {(r) => (
          <div class="space-y-4">
            {/* Toolbar */}
            <div class="flex items-center gap-3">
              <input
                type="search"
                placeholder="Filter by name or address…"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
                class="flex-1 px-3 py-1.5 text-sm rounded-lg border border-rim bg-surface text-txt
                       placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
              />
              <span class="text-xs text-muted whitespace-nowrap shrink-0">
                {r().meta.root_count} total
              </span>
            </div>

            {/* Cards */}
            <Show
              when={filtered().length > 0}
              fallback={
                <p class="text-sm text-muted text-center py-8">
                  {search() ? "No channels match your filter." : "No channels found."}
                </p>
              }
            >
              <div class="space-y-2">
                <For each={filtered()}>
                  {(ch) => <ChannelCard channel={ch} onAct={act} />}
                </For>
              </div>
            </Show>

            {/* Pagination */}
            <div class="flex items-center justify-between pt-1">
              <span class="text-xs text-muted">
                {r().meta.root_count === 0
                  ? "No channels"
                  : `${r().meta.offset + 1}–${r().meta.offset + r().data.length} of ${r().meta.root_count}`}
              </span>
              <div class="flex items-center gap-2">
                <button
                  disabled={page() === 0}
                  onClick={() => { setPage((p) => p - 1); setSearch(""); }}
                  class="px-3 py-1.5 text-xs rounded-lg border border-rim text-txt
                         hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t("admin.page_prev")}
                </button>
                <span class="text-xs text-muted px-1">{page() + 1}</span>
                <button
                  disabled={!r().meta.has_more}
                  onClick={() => { setPage((p) => p + 1); setSearch(""); }}
                  class="px-3 py-1.5 text-xs rounded-lg border border-rim text-txt
                         hover:bg-elevated disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {t("admin.page_next")}
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </SubPageContent>
  );
}

// ── Channel card ──────────────────────────────────────────────────────────────

function ChannelCard(props: {
  channel: AdminChannel;
  onAct: (id: number, action: "block" | "unblock" | "allowcode" | "disallowcode" | "delete") => void;
}) {
  const ch = props.channel;
  const initials = ch.channel_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div class={`rounded-lg border bg-surface px-3 py-2.5 flex items-center gap-3 transition-colors
      ${ch.blocked ? "border-red-300/60 dark:border-red-700/40" : "border-rim"}`}>
      {/* Avatar */}
      <div class={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
        ${ch.blocked
          ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
          : "bg-accent/10 text-accent"}`}>
        {initials || "?"}
      </div>

      {/* Identity */}
      <div class="min-w-0 w-40 shrink-0">
        <p class="text-sm font-medium text-txt leading-tight truncate">{ch.channel_name}</p>
        <p class="text-[11px] text-muted font-mono truncate">@{ch.channel_address}</p>
      </div>

      {/* Badges + dates */}
      <div class="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <Show when={ch.blocked}>
          <span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full shrink-0
                       bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Censored
          </span>
        </Show>
        <Show when={ch.allowcode}>
          <span class="px-1.5 py-0.5 text-[10px] font-medium rounded-full shrink-0
                       bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            Code
          </span>
        </Show>
        <span class="text-[11px] text-muted hidden sm:block truncate">
          Created {fmtDate(ch.channel_created)}
        </span>
      </div>

      {/* Actions */}
      <div class="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => props.onAct(ch.channel_id, ch.blocked ? "unblock" : "block")}
          class={`px-2 py-1 text-xs rounded border transition-colors
            ${ch.blocked
              ? "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
              : "border-rim text-muted hover:bg-elevated"}`}
        >
          {ch.blocked ? "Uncensor" : "Censor"}
        </button>
        <button
          onClick={() => props.onAct(ch.channel_id, ch.allowcode ? "disallowcode" : "allowcode")}
          class="px-2 py-1 text-xs rounded border border-rim text-muted hover:bg-elevated transition-colors"
        >
          {ch.allowcode ? "Disallow code" : "Allow code"}
        </button>
        <button
          onClick={() => props.onAct(ch.channel_id, "delete")}
          class="px-2 py-1 text-xs rounded border border-red-300 text-red-600
                 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function fmtDate(s: string) {
  if (!s || s === "0001-01-01 00:00:00") return "—";
  try { return new Date(s).toLocaleDateString(); } catch { return "—"; }
}

function Skeleton() {
  return (
    <div class="space-y-2 animate-pulse">
      <div class="h-8 rounded-lg border border-rim bg-elevated/30" />
      {Array.from({ length: 6 }, () => (
        <div class="rounded-lg border border-rim bg-surface px-3 py-2.5 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-elevated shrink-0" />
          <div class="w-40 shrink-0 space-y-1.5">
            <div class="h-3.5 w-28 rounded bg-elevated" />
            <div class="h-2.5 w-20 rounded bg-elevated opacity-60" />
          </div>
          <div class="flex-1" />
          <div class="flex gap-1.5 shrink-0">
            <div class="h-6 w-14 rounded bg-elevated" />
            <div class="h-6 w-18 rounded bg-elevated" />
            <div class="h-6 w-12 rounded bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}
