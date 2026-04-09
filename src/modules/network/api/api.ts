import { moduleGet } from "@/shared/lib/api";
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
  pf?: 1;
  star?: 1;
  liked?: 1;
  conv?: 1;
  dm?: 1;
  spam?: 1;
  unseen?: 1;
  nouveau?: 1;
  cmin?: number;
  cmax?: number;
  dend?: string;
  dbegin?: string;
};
export type AclConnection = {
  type: 'c' | 'g';
  name: string;
  nick: string;
  id: string | number;
  xid: string;
  link: string;
  photo?: string;
};
export type AclEntry = {
  type: 'c' | 'g';
  name: string;
  nick: string;
  id: string | number;
  xid: string;
  link: string;
  photo?: string;
};

export async function fetchConnections(): Promise<AclConnection[]> {
  const res = await fetch('/acl');
  if (!res.ok) return [];
  const data = await res.json();
  return (data.items ?? []);
}

export type NetworkStreamResult = {
  items: Post[];
  rootCount: number;
  limit: number;
  nouveau: boolean;
};

export async function fetchNetworkStream(params: NetworkParams = {}): Promise<NetworkStreamResult> {
  const qs = new URLSearchParams({ format: 'json' });
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });
  const raw = await moduleGet<any>(`network?${qs.toString()}`);
  const activities: any[] = Array.isArray(raw) ? raw : (raw?.items ?? []);
  const rootCount: number = raw?.meta?.root_count ?? activities.filter((a: any) => a.item_thread_top === 1).length;
  const limit: number = raw?.meta?.limit ?? 10;
  const nouveau: boolean = raw?.meta?.nouveau ?? false;
  const items = activities.filter(shouldDisplay).map(mapActivityToPost);
  return { items, rootCount, limit, nouveau };
}
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

export async function fetchThread(rootIid: number): Promise<Post[]> {
  const activities = await moduleGet<any[]>(`network?format=json&thread=${rootIid}`);
  return activities.map(mapActivityToPost);
}

export async function postComment(params: {
  body: string;
  parent_iid: number;
  profile_uid: number;
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
  if (data.cancel) return null;
  return mapActivityToPost(data);
}
