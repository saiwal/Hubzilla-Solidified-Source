import { moduleGet } from "../../../shared/api/client";
import { mapActivityToPost } from "../../../shared/hooks/activity.mapper";
import type { Post } from "../../../shared/types/post.types";

export type ChannelParams = {
  start?:   number;
  order?:   'created' | 'commented';
  search?:  string;
  tag?:     string;
  cat?:     string;
  mid?:     string;
  dend?:    string;
  dbegin?:  string;
};

export async function fetchChannelPosts(
  nickname: string,
  params: ChannelParams = {},
): Promise<Post[]> {
  const qs = new URLSearchParams({ format: 'json' });
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  });

  // Empty nickname → /channel?format=json → PHP falls back to local_channel()
  const path = nickname ? `channel/${nickname}` : 'channel';
  const activities = await moduleGet<any[]>(`${path}?${qs.toString()}`);
  if (!Array.isArray(activities)) return [];
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
