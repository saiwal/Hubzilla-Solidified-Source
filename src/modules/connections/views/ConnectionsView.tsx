import { For, Show, createSignal } from 'solid-js';
import { A } from '@solidjs/router';
import {
  connectionsData, refetch, setFilter, setOrder, setSearch, setPage,
  filter, order, search, page, LIMIT,
} from '../store';
import type { ConnectionFilter, ConnectionOrder, Connection } from '../api';
import { deleteConnection, approveConnection } from '../api';

const FILTERS: { id: ConnectionFilter; label: string }[] = [
  { id: 'active',   label: 'Active'    },
  { id: 'pending',  label: 'Pending'   },
  { id: 'blocked',  label: 'Blocked'   },
  { id: 'ignored',  label: 'Ignored'   },
  { id: 'hidden',   label: 'Hidden'    },
  { id: 'archived', label: 'Archived'  },
  { id: 'all',      label: 'All'       },
];

const ORDERS: { id: ConnectionOrder; label: string }[] = [
  { id: 'name',           label: 'Name A–Z'      },
  { id: 'name_desc',      label: 'Name Z–A'      },
  { id: 'connected',      label: 'Oldest first'  },
  { id: 'connected_desc', label: 'Newest first'  },
];

function ConnectionCard(props: { conn: Connection; onDeleted: () => void }) {
  const [busy, setBusy] = createSignal(false);

  async function handleApprove() {
    setBusy(true);
    await approveConnection(props.conn.id);
    props.onDeleted(); // reuse to trigger refetch
  }

  async function handleDelete() {
    if (!confirm(`Remove connection with ${props.conn.name}?`)) return;
    setBusy(true);
    await deleteConnection(props.conn.id);
    props.onDeleted();
  }

  return (
    <div class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800
                rounded-lg border border-gray-200 dark:border-gray-700">
      <a href={props.conn.url} target="_blank" rel="noopener" class="shrink-0">
        <img
          src={props.conn.photo}
          alt={props.conn.name}
          class="w-12 h-12 rounded-full object-cover"
        />
      </a>

      <div class="flex-1 min-w-0">
        <a 
          href={props.conn.url}
          target="_blank"
          rel="noopener"
          class="font-medium truncate hover:underline block"
        >
          {props.conn.name}
        </a>
        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
          {props.conn.address || props.conn.network}
        </p>
        <Show when={props.conn.status.length > 0}>
          <div class="flex gap-1 mt-1 flex-wrap">
            <For each={props.conn.status}>
              {(s) => (
                <span class="text-xs px-1.5 py-0.5 rounded-full
                             bg-yellow-100 dark:bg-yellow-900
                             text-yellow-800 dark:text-yellow-200">
                  {s}
                </span>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="flex gap-2 shrink-0">
        <Show when={props.conn.pending}>
          <button
            onClick={handleApprove}
            disabled={busy()}
            class="text-xs px-2 py-1 rounded bg-green-600 hover:bg-green-700
                   text-white disabled:opacity-50 transition-colors"
          >
            Approve
          </button>
        </Show>
        <A
          href={`/abook/${props.conn.id}`}
          class="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700
                 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Edit
        </A>
        <button
          onClick={handleDelete}
          disabled={busy()}
          class="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900
                 text-red-700 dark:text-red-300
                 hover:bg-red-200 dark:hover:bg-red-800
                 disabled:opacity-50 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export default function ConnectionsView() {
  const [searchInput, setSearchInput] = createSignal('');

  const meta = () => connectionsData()?.meta;
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
      <h1 class="text-2xl font-bold">Connections</h1>

      {/* ── Filter tabs ── */}
      <div class="flex flex-wrap gap-2">
        <For each={FILTERS}>
          {(f) => (
            <button
              onClick={() => handleFilterChange(f.id)}
              class={`px-3 py-1 rounded-full text-sm transition-colors
                ${filter() === f.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
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
                 bg-white dark:bg-gray-800 text-sm focus:outline-none
                 focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={applySearch}
          class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm
                 hover:bg-blue-700 transition-colors"
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
      <Show when={!connectionsData.loading} fallback={
        <p class="text-gray-500 text-sm">Loading…</p>
      }>
        <Show
          when={connections().length > 0}
          fallback={<p class="text-gray-500 text-sm">No connections found.</p>}
        >
          <p class="text-sm text-gray-500">
            {meta()?.total} connection{meta()?.total !== 1 ? 's' : ''}
            {search() ? ` matching "${search()}"` : ''}
          </p>
          <div class="space-y-2">
            <For each={connections()}>
              {(conn) => (
                <ConnectionCard conn={conn} onDeleted={() => refetch()} />
              )}
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
