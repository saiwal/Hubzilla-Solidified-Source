import { createSignal } from 'solid-js';
import { fetchWebpages, deleteWebPage, type WebPage } from '../api/api';

const [pages, setPages] = createSignal<WebPage[]>([]);
const [loading, setLoading] = createSignal(false);
const [error, setError]   = createSignal<string | null>(null);

export { pages, loading, error };

export async function loadWebpages(nick: string) {
  setLoading(true);
  setError(null);
  try {
    setPages(await fetchWebpages(nick));
  } catch (e: any) {
    setError(e.message);
  } finally {
    setLoading(false);
  }
}

export async function removePage(iid: number) {
  // Optimistic
  const prev = pages();
  setPages(prev.filter(p => p.iid !== iid));
  try {
    await deleteWebPage(iid);
  } catch (e: any) {
    setPages(prev); // rollback
    setError(e.message);
  }
}
