import { apiFetch } from "@/shared/lib/fetch";
import { mapActivityToPost } from "@/shared/lib/activity.mapper";
import type { Post } from "@/shared/types/post.types";

export type ChannelParams = {
  start?:  number;
  order?:  'created' | 'commented';
  search?: string;
  tag?:    string;
  cat?:    string;
  mid?:    string;
  dend?:   string;
  dbegin?: string;
  nouveau?: 1;
};

export interface ChannelStreamResult {
  items:     Post[];
  rootCount: number;
  limit:     number;
  nouveau:   boolean;
}

export async function fetchChannelPosts(
  nickname: string,
  params: ChannelParams = {},
): Promise<ChannelStreamResult> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });

  // /api/channel/:nick or /api/channel for own channel
  const path = nickname ? `/api/channel/${nickname}` : '/api/channel';
  const res  = await apiFetch(`${path}?${qs.toString()}`);
  if (!res.ok) throw await res.json();

  const { data, meta } = await res.json();
  const activities: any[] = Array.isArray(data) ? data : [];

  return {
    items:     activities.map(mapActivityToPost),
    rootCount: meta?.root_count ?? activities.filter((a: any) => a.item_thread_top === 1).length,
    limit:     meta?.limit      ?? 10,
    nouveau:   meta?.nouveau    ?? false,
  };
}

// ── postComment and toggleVerb stay as raw fetch ──────────────────────────────
// These hit Hubzilla core endpoints that handle their own auth/CSRF

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
