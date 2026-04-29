import { mapActivityToPost } from "@/shared/lib/activity.mapper";
import type { Post } from "@/shared/types/post.types";


export interface ArticleListResponse {
  meta: { offset: number; limit: number; root_count: number };
  articles: Post[];
}

export interface ArticleSingleResponse {
  article: Post;
  comments: Post[];
}
export async function fetchArticles(
  nick: string,
  params: { start?: number; search?: string; tag?: string; cat?: string } = {},
): Promise<ArticleListResponse> {
  const q = new URLSearchParams();
  if (params.start)  q.set("start",  String(params.start));
  if (params.search) q.set("search", params.search);
  if (params.tag)    q.set("tag",    params.tag);
  if (params.cat)    q.set("cat",    params.cat);
  const qs = q.toString();
  const res = await fetch(`/api/articles/${nick}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch articles");
  const json = await res.json();
  return {
    articles: (json.data ?? []).map(mapActivityToPost),
    meta: json.meta,
  };
}

export async function toggleVerb(
  iid: number,
  verb: 'like' | 'dislike' | 'announce' | 'star',
): Promise<void> {
  const url = `/like/${iid}?verb=${verb}&conv_mode=&page_mode=client&reload=0`;
  const res = await fetch(url, { method: 'GET', credentials: 'include' });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${verb} failed: ${res.status} ${text}`);
  }
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
export async function fetchArticle(
  nick: string,
  uuid: string,
): Promise<ArticleSingleResponse> {
  const res = await fetch(`/api/articles/${nick}?uuid=${encodeURIComponent(uuid)}`);
  if (!res.ok) throw new Error("Failed to fetch article");
  const json = await res.json();
  return {
    article:  mapActivityToPost(json.data.article),
    comments: (json.data.comments ?? []).map(mapActivityToPost),
  };
}
