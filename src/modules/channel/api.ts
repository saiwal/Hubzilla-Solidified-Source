// src/modules/channel/api/api.ts
import { apiFetch } from "@/shared/lib/fetch";
import { mapActivityToPost } from "@/shared/lib/activity.mapper";
// import type { Post } from "@/shared/types/post.types";
import type { StreamResult } from "@/shared/stream/store/createStreamStore";

export type ChannelParams = {
  start?:   number;
  order?:   "created" | "commented";
  search?:  string;
  tag?:     string;
  cat?:     string;
  mid?:     string;
  dend?:    string;
  dbegin?:  string;
  nouveau?: 1;
};

export type ChannelStreamResult = StreamResult & { canPostWall: boolean };

export async function fetchChannelPosts(
  nickname: string,
  params: ChannelParams = {},
): Promise<ChannelStreamResult> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  });

  const path = nickname ? `/api/channel/${nickname}` : "/api/channel";
  const res = await apiFetch(`${path}?${qs.toString()}`);
  if (!res.ok) throw await res.json();

  const { data, meta } = await res.json();
  const activities: any[] = Array.isArray(data) ? data : [];

  return {
    items:        activities.map(mapActivityToPost),
    rootCount:    meta?.root_count ?? activities.filter((a: any) => a.item_thread_top === 1).length,
    limit:        meta?.limit ?? 10,
    nouveau:      meta?.nouveau ?? false,
    canPostWall:  meta?.can_post_wall ?? false,
  };
}

