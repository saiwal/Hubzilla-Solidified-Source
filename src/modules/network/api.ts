import type { Post } from "@/shared/types/post.types.ts";
import { mapActivityToPost } from "@/shared/lib/activity.mapper.ts";
const HIDDEN_VERBS = new Set(['Like', 'Dislike', 'Announce', 'Accept', 'Reject', 'TentativeAccept']);

function shouldDisplay(a: any): boolean {
  if (a.verb === 'Add' || a.verb === 'Remove') return false;
  if (a.flags?.includes('notshown')) return false;
  if (a.obj_type === 'Answer') return false;
  const isThreadTop = a.mid === a.message_top;
  if (HIDDEN_VERBS.has(a.verb) && !isThreadTop) return false;
  return true;
}

export interface Author {
  name: string;
  address: string;
  url: string;
  photo: { src: string; mimetype: string };
}

export interface Item {
  uuid: string;
  mid: string;
  parent_mid: string;
  thr_parent: string;
  created: string;
  edited: string;
  title: string;
  body: string;
  verb: string;
  obj_type: string;
  like_count: number;
  dislike_count: number;
  announce_count: number;
  comment_count: number;
  item_private: number;
  item_thread_top: number;
  item_unseen: number;
  iid: number;
  profile_uid: number;
  flags: string[];
  author: Author;
  permalink: string;
  viewer_liked: boolean;
  viewer_disliked: boolean;
  viewer_repeated: boolean;
}

export interface Reactor {
  name: string;
  address: string;
  url: string;
  photo: string;
  created: string;
}

export interface ReactionCounts {
  like_count: number;
  dislike_count: number;
  announce_count: number;
}
export type NetworkParams = {
  start?: number;
  order?: 'created' | 'commented' | 'unthreaded';
  search?: string;
  tag?: string;
  cat?: string;
  verb?: string;
  file?: string;
  gid?: number;
  cid?: number;
  xchan?: string;
  net?: string;
  pf?: 1;
  star?: 1;
  liked?: 1;
  conv?: 1;
  dm?: 1;
  event?: 1;
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

export async function fetchFolders(): Promise<string[]> {
  const res = await fetch('/api/folders');
  if (!res.ok) return [];
  const { data } = await res.json();
  return Array.isArray(data) ? data : [];
}

export type NetworkStreamResult = {
  items: Post[];
  rootCount: number;
  limit: number;
  nouveau: boolean;
};
export async function fetchNetworkStream(params: NetworkParams = {}): Promise<NetworkStreamResult> {
  // `event` is a UI-only convenience flag — translate to backend verb filter
  const { event, ...rest } = params;
  const apiParams = event ? { ...rest, verb: '.Event' } : rest;

  const qs = new URLSearchParams();
  Object.entries(apiParams).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });

  const res = await fetch(`/api/network?${qs.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  const { data, meta } = await res.json();

  const activities: any[] = Array.isArray(data) ? data : [];
  const rootCount: number = meta?.root_count ?? activities.filter((a: any) => a.item_thread_top === 1).length;
  const limit: number     = meta?.limit   ?? 10;
  const nouveau: boolean  = meta?.nouveau ?? false;

  const items = activities.filter(shouldDisplay).map(mapActivityToPost);
  return { items, rootCount, limit, nouveau };
}
// Re-export shared item API helpers for use within this module

export {
  fetchItemDetail,
  fetchComments,
  fetchLikes,
  fetchDislikes,
  fetchRepeats,
  apiCreatePost,
  apiCreateComment,
  apiToggleLike,
  apiToggleDislike,
  apiToggleRepeat,
  apiToggleStar,
  apiEditItem,
  apiDeleteItem,
} from '@/shared/lib/item-api';
