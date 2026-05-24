import { createEffect, createSignal, Show, For, onMount } from "solid-js";
import {
  entries, loading, loadingMore, hasMore, total, error,
  loadDirectory, loadMoreDirectory, resetDirectory,
} from "../../people/store";
import DirectoryCard from "../DirectoryCard";
import DirectoryEntryModal from "../DirectoryEntryModal";
import type { DirectoryParams, DirectoryEntry } from "../../people/api";

type Order = DirectoryParams["order"];

export default function DirectorySection() {
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
    if (!effectRan) { effectRan = true; return; }
    resetDirectory();
    loadDirectory({ order: o, global: g, suggest: s ? 1 : 0 });
  });

  function handleSearch(e: Event) {
    e.preventDefault();
    resetDirectory();
    loadDirectory({ search: search(), order: order(), global: globalDir(), suggest: 0 });
    setSuggest(false);
  }

  return (
    <div class="px-4 md:px-6 py-6 space-y-4">

      {/* ── Toolbar ── */}
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <form onSubmit={handleSearch} class="flex gap-2 flex-1">
          <input
            type="text"
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            placeholder="Name, address, or keyword…"
            class="flex-1 border border-rim rounded-lg px-3 py-1.5 text-sm bg-surface text-txt
                   placeholder:text-muted focus:outline-none hover:border-rim-strong
                   focus:border-rim-strong transition-colors"
          />
          <button
            type="submit"
            class="px-4 py-1.5 rounded-lg bg-accent text-accent-fg text-sm hover:opacity-80 transition-opacity"
          >
            Search
          </button>
        </form>

        <div class="flex flex-wrap gap-2">
          <select
            value={order()}
            onChange={(e) => setOrder(e.currentTarget.value as Order)}
            class="px-3 py-1.5 rounded-lg border border-rim bg-surface text-txt text-sm
                   focus:outline-none hover:border-rim-strong transition-colors"
          >
            <option value="date">Newest first</option>
            <option value="rdate">Oldest first</option>
            <option value="alphabetic">A → Z</option>
            <option value="ralpha">Z → A</option>
          </select>

          <button
            onClick={() => setGlobalDir((g) => (g === 1 ? 0 : 1))}
            class={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              globalDir() === 1
                ? "border-accent bg-accent-muted text-accent"
                : "border-rim text-muted hover:bg-overlay"
            }`}
          >
            {globalDir() === 1 ? "🌐 Global" : "🏠 Local"}
          </button>

          <button
            onClick={() => setSuggest((s) => !s)}
            class={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              suggest()
                ? "border-accent bg-accent-muted text-accent"
                : "border-rim text-muted hover:bg-overlay"
            }`}
          >
            {suggest() ? "✓ Suggestions" : "Suggest"}
          </button>
        </div>
      </div>

      {/* ── Count ── */}
      <Show when={!loading() && total() > 0}>
        <p class="text-sm text-muted">{total().toLocaleString()} channels found</p>
      </Show>

      {/* ── Error ── */}
      <Show when={error()}>
        <div class="rounded-lg bg-accent-muted border border-accent p-4 text-sm text-accent">
          {error()}
        </div>
      </Show>

      {/* ── Skeleton ── */}
      <Show when={loading()}>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <For each={Array(12).fill(0)}>{() => <CardSkeleton />}</For>
        </div>
      </Show>

      {/* ── Results ── */}
      <Show when={!loading()}>
        <Show
          when={entries().length > 0}
          fallback={<p class="py-12 text-center text-muted">No channels found.</p>}
        >
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={entries()}>
              {(entry) => <DirectoryCard entry={entry} onSelect={setSelected} />}
            </For>
          </div>
        </Show>

        <Show when={hasMore() && !loadingMore()}>
          <div class="flex justify-center py-4">
            <button
              onClick={loadMoreDirectory}
              class="px-4 py-2 text-sm font-medium rounded-lg border border-rim
                     bg-surface text-muted hover:bg-overlay transition-colors"
            >
              Load more
            </button>
          </div>
        </Show>

        <Show when={loadingMore()}>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <For each={Array(6).fill(0)}>{() => <CardSkeleton />}</For>
          </div>
        </Show>

        <Show when={!hasMore() && entries().length > 0}>
          <p class="py-4 text-center text-sm text-muted">End of results</p>
        </Show>
      </Show>

      {/* ── Detail modal ── */}
      <DirectoryEntryModal entry={selected()} onClose={() => setSelected(null)} />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div class="rounded-xl border border-rim bg-surface p-4 space-y-3 animate-pulse">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-overlay shrink-0" />
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-overlay rounded w-3/4" />
          <div class="h-3 bg-overlay rounded w-1/2" />
        </div>
      </div>
      <div class="h-3 bg-overlay rounded w-full" />
      <div class="h-3 bg-overlay rounded w-2/3" />
    </div>
  );
}
