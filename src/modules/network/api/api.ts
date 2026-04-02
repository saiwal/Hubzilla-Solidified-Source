import { moduleGet } from "@/shared/api/client";
import type { Post } from "@/shared/types/post.types.ts";
import { mapActivityToPost } from "@/shared/lib/activity.mapper.ts";

const HIDDEN_VERBS = new Set(['Like', 'Dislike', 'Announce', 'Accept', 'Reject', 'TentativeAccept']);

function shouldDisplay(a: any): boolean {
  if (a.verb === 'Add' || a.verb === 'Remove') return false;
  if (a.flags?.includes('notshown')) return false;
  if (a.object_type === 'Answer') return false;
  const isThreadTop = a.message_id === a.message_top;
  if (HIDDEN_VERBS.has(a.verb) && !isThreadTop) return false;
  return true;
}

export type NetworkParams = {
  start?: number;
  order?: 'created' | 'commented' | 'unthreaded';
  search?: string;
  tag?: string;
  cat?: string;
  verb?: string;
  gid?: number;
  cid?: number;
  xchan?: string;
  net?: string;
  star?: 1;
  conv?: 1;
  dm?: 1;
  cmin?: number;
  cmax?: number;
  dend?: string;
  dbegin?: string;
};

// api.ts — fetchNetworkStream
export async function fetchNetworkStream(params: NetworkParams = {}): Promise<Post[]> {
  const qs = new URLSearchParams({ format: 'json' });
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const raw = await moduleGet<any>(`network?${qs.toString()}`);
  const activities: any[] = Array.isArray(raw) ? raw : [];
  return activities
    .filter(shouldDisplay)
    .map(mapActivityToPost);
}
/** Toggle like / dislike / announce (repeat) on a post.
 *  Hubzilla's handler: GET /like/{iid}?verb=…&conv_mode=&page_mode=client&reload=0
 *  iid is the local integer item id returned by the network JSON hook.
 */
export async function toggleVerb(
  iid: number,
  verb: 'like' | 'dislike' | 'announce',
): Promise<void> {
  const url = `/like/${iid}?verb=${verb}&conv_mode=&page_mode=client&reload=0`;
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${verb} failed: ${res.status} ${text}`);
  }
}

/** Fetch a single thread by its root iid — used to refresh after commenting */
export async function fetchThread(rootIid: number): Promise<Post[]> {
  const activities = await moduleGet<any[]>(`network?format=json&thread=${rootIid}`);
  return activities.map(mapActivityToPost);
}

/** Post a comment on a thread item */
export async function postComment(params: {
  body: string;
  parent_iid: number;   // integer id of the direct parent item
  profile_uid: number;  // local channel id of the logged-in user
}): Promise<Post | null> {
  const formData = new URLSearchParams();
  formData.set('type', 'net-comment');
  formData.set('profile_uid', String(params.profile_uid));
  formData.set('parent', String(params.parent_iid));
  formData.set('body', params.body);
  formData.set('return', '');
  formData.set('jsreload', '');
  formData.set('preview', '0');
  formData.set('conv_mode', '');

  const res = await fetch('/item', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!res.ok) throw new Error(`Comment failed: ${res.status}`);
  const data = await res.json();
  // Hubzilla returns {cancel:1, reload:"..."} on success — not the new item
  if (data.cancel) return null;
  return mapActivityToPost(data);
}
