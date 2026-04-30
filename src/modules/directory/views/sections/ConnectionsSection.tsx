import { For, Show, createSignal } from "solid-js";
import { A } from "@solidjs/router";
import {
  connectionsData, refetch, setFilter, setOrder, setSearch, setPage,
  filter, order, search, page, LIMIT,
} from "../../connections/store";
import type { ConnectionFilter, ConnectionOrder, Connection } from "../../connections/api";
import { deleteConnection, approveConnection } from "../../connections/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS: { id: ConnectionFilter; label: string }[] = [
  { id: "active",   label: "Active"   },
  { id: "pending",  label: "Pending"  },
  { id: "blocked",  label: "Blocked"  },
  { id: "ignored",  label: "Ignored"  },
  { id: "hidden",   label: "Hidden"   },
  { id: "archived", label: "Archived" },
  { id: "all",      label: "All"      },
];

const ORDERS: { id: ConnectionOrder; label: string }[] = [
  { id: "name",           label: "Name A–Z"     },
  { id: "name_desc",      label: "Name Z–A"     },
  { id: "connected",      label: "Oldest first" },
  { id: "connected_desc", label: "Newest first" },
];

const NETWORK_LABELS: Record<string, string> = {
  zot6:        "Zot",
  activitypub: "AP",
  rss:         "RSS",
};

function formatDate(iso: string): string {
  if (!iso || iso.startsWith("0001")) return "—";
  return new Date(iso.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── ConnectionCard ────────────────────────────────────────────────────────────

function ConnectionCard(props: { conn: Connection; onDeleted: () => void }) {
  const [busy, setBusy] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);

  const networkLabel = () => NETWORK_LABELS[props.conn.network] ?? props.conn.network;

  async function handleApprove() {
    setBusy(true);
    await approveConnection(props.conn.id);
    props.onDeleted();
  }

  async function handleDelete() {
    if (!confirm(`Remove connection with ${props.conn.name}?`)) return;
    setBusy(true);
    await deleteConnection(props.conn.id);
    props.onDeleted();
  }

  return (
    <div class="rounded-lg border border-rim bg-surface overflow-hidden">
      <div class="flex items-center gap-3 p-3">
        <a href={props.conn.url} target="_blank" rel="noopener" class="shrink-0">
          <img
            src={props.conn.photo}
            alt={props.conn.name}
            class="w-11 h-11 rounded-full object-cover ring-1 ring-rim bg-overlay"
          />
        </a>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <a
              href={props.conn.url}
              target="_blank"
              rel="noopener"
              class="font-medium text-sm text-txt truncate hover:underline"
            >
              {props.conn.name}
            </a>
            <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-accent-muted text-accent">
              {networkLabel()}
            </span>
            <Show when={props.conn.is_forum}>
              <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-accent-muted text-accent">
                Forum
              </span>
            </Show>
            <Show when={props.conn.pending}>
              <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-accent-muted text-accent">
                Pending
              </span>
            </Show>
            <For each={props.conn.status}>
              {(s) => (
                <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-accent-muted text-accent">
                  {s}
                </span>
              )}
            </For>
          </div>
          <p class="text-xs text-muted truncate mt-0.5">
            {props.conn.address || props.conn.url}
          </p>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <Show when={props.conn.pending}>
            <button
              onClick={handleApprove}
              disabled={busy()}
              class="text-xs px-2 py-1 rounded bg-accent text-accent-txt hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              Approve
            </button>
          </Show>
          <button
            onClick={() => setExpanded((e) => !e)}
            class="p-1.5 rounded text-muted hover:text-txt hover:bg-overlay transition-colors"
            title="Details"
          >
            <svg
              class={`w-3.5 h-3.5 transition-transform ${expanded() ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <A
            href={`/abook/${props.conn.id}`}
            class="p-1.5 rounded text-muted hover:text-txt hover:bg-overlay transition-colors"
            title="Edit"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586a2 2 0 00-2.828-2.828l-8.586 8.586V15h2.828z" />
            </svg>
          </A>
          <button
            onClick={handleDelete}
            disabled={busy()}
            class="p-1.5 rounded text-muted hover:text-accent hover:bg-accent-muted disabled:opacity-50 transition-colors"
            title="Remove"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3H4" />
            </svg>
          </button>
        </div>
      </div>

      <Show when={expanded()}>
        <div class="px-3 pb-3 pt-0 border-t border-rim grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
          <DetailField label="Connected" value={formatDate(props.conn.connected)} />
          <DetailField label="Closeness" value={String(props.conn.closeness)} />
          <DetailField label="Role"      value={props.conn.role} />
          <DetailField label="Network"   value={props.conn.network} />
          <Show when={props.conn.address}>
            <DetailField label="Address" value={props.conn.address} />
          </Show>
        </div>
      </Show>
    </div>
  );
}

function DetailField(props: { label: string; value: string }) {
  return (
    <div class="pt-2">
      <p class="text-muted uppercase tracking-wide text-[10px] font-semibold">{props.label}</p>
      <p class="text-txt mt-0.5 break-all">{props.value}</p>
    </div>
  );
}

function ConnectionsSkeleton() {
  return (
    <div class="space-y-2">
      <For each={Array(8).fill(0)}>
        {() => (
          <div class="rounded-lg border border-rim bg-surface p-3 flex items-center gap-3 animate-pulse">
            <div class="w-11 h-11 rounded-full bg-overlay shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-3.5 bg-overlay rounded w-1/3" />
              <div class="h-3 bg-overlay rounded w-1/2" />
            </div>
          </div>
        )}
      </For>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export default function ConnectionsSection() {
  const [searchInput, setSearchInput] = createSignal("");

  const meta        = () => connectionsData()?.meta;
  const connections = () => connectionsData()?.connections ?? [];
  const totalPages  = () => Math.ceil((meta()?.total ?? 0) / LIMIT);

  function applySearch() {
    setSearch(searchInput());
    setPage(0);
  }

  function handleFilterChange(f: ConnectionFilter) {
    setFilter(f);
    setPage(0);
  }

  function handleOrderChange(o: ConnectionOrder) {
    setOrder(o);
    setPage(0);
  }

  return (
    <div class="px-4 md:px-6 py-6 space-y-4">

      {/* ── Filter tabs ── */}
      <div class="flex flex-wrap gap-1.5">
        <For each={FILTERS}>
          {(f) => (
            <button
              onClick={() => handleFilterChange(f.id)}
              class={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter() === f.id
                  ? "bg-accent text-accent-txt"
                  : "bg-overlay text-muted hover:bg-surface"
              }`}
            >
              {f.label}
            </button>
          )}
        </For>
      </div>

      {/* ── Search + sort ── */}
      <div class="flex gap-2">
        <input
          type="search"
          placeholder="Search connections…"
          value={searchInput()}
          onInput={(e) => setSearchInput(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && applySearch()}
          class="flex-1 px-3 py-2 rounded-lg border border-rim bg-surface text-sm text-txt
                 placeholder:text-muted focus:outline-none hover:border-rim-strong
                 focus:border-rim-strong transition-colors"
        />
        <button
          onClick={applySearch}
          class="px-4 py-2 rounded-lg bg-accent text-accent-txt text-sm hover:opacity-80 transition-opacity"
        >
          Search
        </button>
        <select
          value={order()}
          onChange={(e) => handleOrderChange(e.currentTarget.value as ConnectionOrder)}
          class="px-3 py-2 rounded-lg border border-rim bg-surface text-txt text-sm
                 focus:outline-none hover:border-rim-strong transition-colors"
        >
          <For each={ORDERS}>
            {(o) => <option value={o.id}>{o.label}</option>}
          </For>
        </select>
      </div>

      {/* ── Results ── */}
      <Show when={!connectionsData.loading} fallback={<ConnectionsSkeleton />}>
        <Show
          when={connections().length > 0}
          fallback={<p class="py-8 text-center text-sm text-muted">No connections found.</p>}
        >
          <p class="text-sm text-muted">
            {meta()?.total} connection{meta()?.total !== 1 ? "s" : ""}
            {search() ? ` matching "${search()}"` : ""}
          </p>

          <div class="space-y-2">
            <For each={connections()}>
              {(conn) => <ConnectionCard conn={conn} onDeleted={() => refetch()} />}
            </For>
          </div>

          <Show when={totalPages() > 1}>
            <div class="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page() === 0}
                class="px-3 py-1.5 rounded border border-rim text-txt text-sm
                       disabled:opacity-40 hover:bg-overlay transition-colors"
              >
                ← Prev
              </button>
              <span class="text-sm text-muted">{page() + 1} / {totalPages()}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages() - 1, p + 1))}
                disabled={page() === totalPages() - 1}
                class="px-3 py-1.5 rounded border border-rim text-txt text-sm
                       disabled:opacity-40 hover:bg-overlay transition-colors"
              >
                Next →
              </button>
            </div>
          </Show>
        </Show>
      </Show>
    </div>
  );
}
