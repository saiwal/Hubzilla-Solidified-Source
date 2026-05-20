// modules/directory/store/store.ts

import { createSignal } from "solid-js";
import { fetchDirectory } from "./api";
import type { DirectoryEntry, DirectoryParams } from "./api";

// ── State ─────────────────────────────────────────────────────────────────────

const [entries, setEntries] = createSignal<DirectoryEntry[]>([]);
const [loading, setLoading] = createSignal(false);
const [loadingMore, setLoadingMore] = createSignal(false);
const [hasMore, setHasMore] = createSignal(false);
const [total, setTotal] = createSignal(0);
const [error, setError] = createSignal<string | null>(null);

let currentParams: DirectoryParams = {};
let currentStart = 0;

// ── Actions ───────────────────────────────────────────────────────────────────

export async function loadDirectory(params: DirectoryParams = {}) {
  currentParams = params;
  currentStart = 0;
  setLoading(true);
  setError(null);
  setHasMore(false);
  try {
    const data = await fetchDirectory({ ...params, start: 0 });
    setEntries(data.entries);
    setTotal(data.meta.total);
    currentStart = data.entries.length;
    setHasMore(data.entries.length >= data.meta.limit);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Unknown error");
    setEntries([]);
  } finally {
    setLoading(false);
  }
}

export async function loadMoreDirectory() {
  if (loadingMore() || !hasMore()) return;
  setLoadingMore(true);
  try {
    const data = await fetchDirectory({
      ...currentParams,
      start: currentStart,
    });
    const existingHashes = new Set(entries().map((e) => e.hash));
    const fresh = data.entries.filter((e) => !existingHashes.has(e.hash));
    setEntries((prev) => [...prev, ...fresh]);
    currentStart += data.entries.length;
    setHasMore(data.entries.length >= data.meta.limit && fresh.length > 0);
  } catch (err) {
    console.error("Load more failed:", err);
  } finally {
    setLoadingMore(false);
  }
}

export function resetDirectory() {
  setEntries([]);
  setTotal(0);
  setHasMore(false);
  setError(null);
  currentStart = 0;
  currentParams = {};
}

export { entries, loading, loadingMore, hasMore, total, error };
