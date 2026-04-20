// modules/directory/views/ConnectionsView.tsx

import { For, Show, createSignal } from 'solid-js';
import { A } from '@solidjs/router';
import {
  connectionsData, refetch, setFilter, setOrder, setSearch, setPage,
  filter, order, search, page, LIMIT,
} from '../store';
import type { ConnectionFilter, ConnectionOrder, Connection } from '../api';
import { deleteConnection, approveConnection } from '../api';

const FILTERS: { id: ConnectionFilter; label: string }[] = [
  { id: 'active',   label: 'Active'   },
  { id: 'pending',  label: 'Pending'  },
  { id: 'blocked',  label: 'Blocked'  },
  { id: 'ignored',  label: 'Ignored'  },
  { id: 'hidden',   label: 'Hidden'   },
  { id: 'archived', label: 'Archived' },
  { id: 'all',      label: 'All'      },
];

const ORDERS: { id: ConnectionOrder; label: string }[] = [
  { id: 'name',           label: 'Name A–Z'     },
  { id: 'name_desc',      label: 'Name Z–A'     },
  { id: 'connected',      label: 'Oldest first' },
  { id: 'connected_desc', label: 'Newest first' },
];

const NETWORK_LABELS: Record<string, string> = {
  zot6:        'Zot',
  activitypub: 'AP',
  rss:         'RSS',
};

const NETWORK_COLORS: Record<string, string> = {
  zot6:        'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300',
  activitypub: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  rss:         'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
};

function formatDate(iso: string): string {
  if (!iso || iso.startsWith('0001')) return '—';
  return new Date(iso.replace(' ', 'T') + 'Z').toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function ConnectionCard(props: { conn: Connection; onDeleted: () => void }) {
  const [busy, setBusy] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);

  const networkLabel = () => NETWORK_LABELS[props.conn.network] ?? props.conn.network;
  const networkColor = () => NETWORK_COLORS[props.conn.network] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';

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
    <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* ── Main row ── */}
      <div class="flex items-center gap-3 p-3">
        <a href={props.conn.url} target="_blank" rel="noopener" class="shrink-0">
          <img
            src={props.conn.photo}
            alt={props.conn.name}
            class="w-11 h-11 rounded-full object-cover ring-1 ring-gray-200 dark:ring-gray-600 bg-gray-100 dark:bg-gray-700"
          />
        </a>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <a
              href={props.conn.url}
              target="_blank"
              rel="noopener"
              class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate hover:underline"
            >
              {props.conn.name}
            </a>
            {/* Network badge */}
            <span class={`shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${networkColor()}`}>
              {networkLabel()}
            </span>
            {/* Forum badge */}
            <Show when={props.conn.is_forum}>
              <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300">
                Forum
              </span>
            </Show>
            {/* Pending badge */}
            <Show when={props.conn.pending}>
              <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                Pending
              </span>
            </Show>
            {/* Status badges */}
            <For each={props.conn.status}>
              {(s) => (
                <span class="shrink-0 text-xs px-1.5 py-0.5 rounded font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                  {s}
                </span>
              )}
            </For>
          </div>
          <p class="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
            {props.conn.address || props.conn.url}
          </p>
        </div>

        {/* Actions */}
        <div class="flex items-center gap-1.5 shrink-0">
          <Show when={props.conn.pending}>
            <button
              onClick={handleApprove}
              disabled={busy()}
              class="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transition-colors"
            >
              Approve
            </button>
          </Show>
          <button
            onClick={() => setExpanded(e => !e)}
            class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Details"
          >
            <svg class={`w-3.5 h-3.5 transition-transform ${expanded() ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <A
            href={`/abook/${props.conn.id}`}
            class="p-1.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Edit"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
          </A>
          <button
            onClick={handleDelete}
            disabled={busy()}
            class="p-1.5 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
            title="Remove"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Expanded details ── */}
      <Show when={expanded()}>
        <div class="px-3 pb-3 pt-0 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
          <DetailField label="Connected" value={formatDate(props.conn.connected)} />
          <DetailField label="Closeness" value={String(props.conn.closeness)} />
          <DetailField label="Role" value={props.conn.role} />
          <DetailField label="Network" value={props.conn.network} />
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
      <p class="text-gray-400 dark:text-gray-500 uppercase tracking-wide text-[10px] font-semibold">{props.label}</p>
      <p class="text-gray-700 dark:text-gray-300 mt-0.5 break-all">{props.value}</p>
    </div>
  );
}

export default function ConnectionsView() {
  const [searchInput, setSearchInput] = createSignal('');

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
    <div class="max-w-3xl mx-auto space-y-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Connections</h1>

      {/* ── Filter tabs ── */}
      <div class="flex flex-wrap gap-1.5">
        <For each={FILTERS}>
          {(f) => (
            <button
              onClick={() => handleFilterChange(f.id)}
              class={`px-3 py-1 rounded-full text-sm transition-colors
                ${filter() === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
          onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={applySearch}
          class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        <select
          value={order()}
          onChange={(e) => handleOrderChange(e.currentTarget.value as ConnectionOrder)}
          class="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                 bg-white dark:bg-gray-800 text-sm focus:outline-none"
        >
          <For each={ORDERS}>
            {(o) => <option value={o.id}>{o.label}</option>}
          </For>
        </select>
      </div>

      {/* ── Results ── */}
      <Show
        when={!connectionsData.loading}
        fallback={<ConnectionsSkeleton />}
      >
        <Show
          when={connections().length > 0}
          fallback={<p class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">No connections found.</p>}
        >
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {meta()?.total} connection{meta()?.total !== 1 ? 's' : ''}
            {search() ? ` matching "${search()}"` : ''}
          </p>

          <div class="space-y-2">
            <For each={connections()}>
              {(conn) => <ConnectionCard conn={conn} onDeleted={() => refetch()} />}
            </For>
          </div>

          {/* ── Pagination ── */}
          <Show when={totalPages() > 1}>
            <div class="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page() === 0}
                class="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700
                       disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700
                       text-sm transition-colors"
              >
                ← Prev
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {page() + 1} / {totalPages()}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages() - 1, p + 1))}
                disabled={page() === totalPages() - 1}
                class="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700
                       disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-700
                       text-sm transition-colors"
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

function ConnectionsSkeleton() {
  return (
    <div class="space-y-2">
      <For each={Array(8).fill(0)}>
        {() => (
          <div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center gap-3 animate-pulse">
            <div class="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
