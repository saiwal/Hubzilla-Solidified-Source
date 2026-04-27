// modules/directory/views/DirectoryView.tsx

import { createEffect, createSignal, Show, For, onMount } from "solid-js";
import {
  entries,
  loading,
  loadingMore,
  hasMore,
  total,
  error,
  loadDirectory,
  loadMoreDirectory,
  resetDirectory,
} from "../store";
import DirectoryCard from "./DirectoryCard";
import DirectoryEntryModal from "./DirectoryEntryModal";
import type { DirectoryParams, DirectoryEntry } from "../api";

type Order = DirectoryParams["order"];

export default function DirectoryView() {
  const [search, setSearch] = createSignal("");
  const [order, setOrder] = createSignal<Order>("date");
  const [globalDir, setGlobalDir] = createSignal<0 | 1>(1);
  const [suggest, setSuggest] = createSignal(false);
  const [selected, setSelected] = createSignal<DirectoryEntry | null>(null);

  let initialized = false;

  onMount(() => {
    if (initialized) return;
    initialized = true;
    resetDirectory();
    loadDirectory({ order: order(), global: globalDir() });
  });

  let effectRan = false;
  createEffect(() => {
    const o = order();
    const g = globalDir();
    const s = suggest();
    if (!effectRan) {
      effectRan = true;
      return;
    }
    resetDirectory();
    loadDirectory({ order: o, global: g, suggest: s ? 1 : 0 });
  });

  function handleSearch(e: Event) {
    e.preventDefault();
    resetDirectory();
    loadDirectory({
      search: search(),
      order: order(),
      global: globalDir(),
      suggest: 0,
    });
    setSuggest(false);
  }

  return (
    <div class="space-y-4">
      {/* ── Header ── */}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 class="text-2xl font-bold text-txt">
          Directory
        </h1>
        <div class="relative">
          <form onSubmit={handleSearch} class="flex gap-2">
            <input
              type="text"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search by name, address, or keyword…"
              class="flex-1 px-3 py-2 rounded-lg border border-rim
                 bg-surface text-txt
                 placeholder-gray-400 dark:placeholder-gray-500
                 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              type="submit"
              class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium
                 hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* ── Filters row ── */}
      <div class="flex flex-wrap gap-2 text-sm">
        <select
          value={order()}
          onChange={(e) => setOrder(e.currentTarget.value as Order)}
          class="px-3 py-1.5 rounded-lg border border-rim
                 bg-surface text-gray-700 dark:text-gray-300
                 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="date">Newest first</option>
          <option value="rdate">Oldest first</option>
          <option value="alphabetic">A → Z</option>
          <option value="ralpha">Z → A</option>
        </select>

        <button
          onClick={() => setGlobalDir((g) => (g === 1 ? 0 : 1))}
          class={`px-3 py-1.5 rounded-lg border transition-colors
            ${
              globalDir() === 1
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "border-rim text-gray-600 dark:text-gray-400 hover:bg-elevated"
            }`}
        >
          {globalDir() === 1 ? "🌐 Global" : "🏠 Local"}
        </button>
        <button
          onClick={() => setSuggest((s) => !s)}
          class={`text-sm px-3 py-1.5 rounded-lg border transition-colors
            ${
              suggest()
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                : "border-rim hover:bg-elevated text-gray-600 dark:text-gray-400"
            }`}
        >
          {suggest() ? "✓ Suggestions" : "Suggest channels"}
        </button>
      </div>

      {/* ── Total count ── */}
      <Show when={!loading() && total() > 0}>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {total().toLocaleString()} channels found
        </p>
      </Show>

      {/* ── Error ── */}
      <Show when={error()}>
        <div class="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          {error()}
        </div>
      </Show>

      {/* ── Loading skeleton ── */}
      <Show when={loading()}>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <For each={Array(9).fill(0)}>{() => <DirectoryCardSkeleton />}</For>
        </div>
      </Show>

      {/* ── Results grid ── */}
      <Show when={!loading()}>
        <Show
          when={entries().length > 0}
          fallback={
            <p class="py-12 text-center text-gray-400 dark:text-gray-500">
              No channels found.
            </p>
          }
        >
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={entries()}>
              {(entry) => (
                <DirectoryCard entry={entry} onSelect={setSelected} />
              )}
            </For>
          </div>
        </Show>

        <Show when={hasMore() && !loadingMore()}>
          <div class="flex justify-center py-4">
            <button
              onClick={loadMoreDirectory}
              class="px-4 py-2 text-sm font-medium rounded-lg border border-rim
                     bg-surface text-gray-600 dark:text-gray-300
                     hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Load more
            </button>
          </div>
        </Show>

        <Show when={loadingMore()}>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={Array(6).fill(0)}>{() => <DirectoryCardSkeleton />}</For>
          </div>
        </Show>

        <Show when={!hasMore() && entries().length > 0}>
          <p class="py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            End of results
          </p>
        </Show>
      </Show>

      {/* ── Detail modal ── */}
      <DirectoryEntryModal
        entry={selected()}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function DirectoryCardSkeleton() {
  return (
    <div class="rounded-xl border border-rim bg-surface p-4 space-y-3 animate-pulse">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-elevated shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-elevated rounded w-3/4" />
          <div class="h-3 bg-elevated rounded w-1/2" />
        </div>
      </div>
      <div class="h-3 bg-elevated rounded w-full" />
      <div class="h-3 bg-elevated rounded w-2/3" />
    </div>
  );
}
