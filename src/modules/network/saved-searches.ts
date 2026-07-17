import { createSignal } from "solid-js";
import { apiFetch } from "@/shared/lib/fetch";

export type SavedSearch = {
  id: number;
  label: string;
  params: Record<string, string>;
};

const [savedSearches, _set] = createSignal<SavedSearch[]>([]);
const [_loaded, setLoaded]  = createSignal(false);

export { savedSearches };

export async function loadSavedSearches(): Promise<void> {
  if (_loaded()) return;
  try {
    const res = await apiFetch("/spa/saved-searches");
    if (res.ok) {
      const { data } = await res.json();
      _set(Array.isArray(data) ? data : []);
      setLoaded(true);
    }
  } catch { /* ignore — unauthenticated or network error */ }
}

export async function addSavedSearch(label: string, params: Record<string, string>): Promise<void> {
  const res = await apiFetch("/spa/saved-searches", {
    method: "POST",
    body: JSON.stringify({ label, params }),
  });
  if (res.ok) {
    const { data } = await res.json();
    _set([data, ...savedSearches()]);
  }
}

export async function removeSavedSearch(id: number): Promise<void> {
  _set(savedSearches().filter((s) => s.id !== id));
  await apiFetch(`/spa/saved-searches/${id}`, { method: "DELETE" });
}
