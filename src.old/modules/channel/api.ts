import { moduleGet } from "../../core/api/client";
import { mapActivityToPost } from "../network/mapper";
import type { Post } from "../../types/types";

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
