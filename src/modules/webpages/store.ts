import { createSignal } from 'solid-js';
import { fetchWebpages, deleteWebPage, type WebPage } from './api';
import { toast } from "@/shared/store/toast";

// Module-level singletons — survive navigation by design.
// loadWebpages() guards against redundant fetches when store is already populated
// for the same nick; pass force=true to bypass the guard (e.g. after a delete).

const [pages, setPages]   = createSignal<WebPage[]>([]);
const [loading, setLoading] = createSignal(false);
const [error, setError]   = createSignal<string | null>(null);
const [currentNick, setCurrentNick] = createSignal<string>('');

// Layout template id assigned to the webpage currently displayed by PageView
// (if any) — lets Layout.tsx resolve the right sidebar from that template
// instead of the module default. See ModuleDef.pageTemplate.
const [currentPageTemplateId, setCurrentPageTemplateId] = createSignal<string | null>(null);

export { pages, loading, error, currentNick, currentPageTemplateId, setCurrentPageTemplateId };

export async function loadWebpages(nick: string, force = false) {
  // Avoid wiping already-loaded data when navigating back to the same channel
  if (!force && currentNick() === nick && pages().length > 0) return;

  setCurrentNick(nick);
  setLoading(true);
  setError(null);
  try {
    setPages(await fetchWebpages(nick));
  } catch (e: any) {
    setError(e.message);
    toast.error(e.message);
  } finally {
    setLoading(false);
  }
}

export async function removePage(iid: number) {
  const prev = pages();
  // Optimistic update
  setPages(prev.filter(p => p.iid !== iid));
  try {
    await deleteWebPage(iid);
  } catch (e: any) {
    setPages(prev); // rollback on failure
    setError(e.message);
    toast.error(e.message);
  }
}
