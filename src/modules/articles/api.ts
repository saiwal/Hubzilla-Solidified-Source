import { mapActivityToPost } from "@/shared/lib/activity.mapper";
import type { Post } from "@/shared/types/post.types";
import { apiFetch } from "@/shared/lib/fetch";

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
  if (params.start) q.set("start", String(params.start));
  if (params.search) q.set("search", params.search);
  if (params.tag) q.set("tag", params.tag);
  if (params.cat) q.set("cat", params.cat);
  const qs = q.toString();
  const res = await fetch(`/api/articles/${nick}${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("Failed to fetch articles");
  const json = await res.json();
  return {
    articles: (json.data ?? []).map(mapActivityToPost),
    meta: json.meta,
  };
}

export async function fetchArticle(
  nick: string,
  uuid: string,
): Promise<ArticleSingleResponse> {
  const res = await fetch(
    `/api/articles/${nick}?uuid=${encodeURIComponent(uuid)}`,
  );
  if (!res.ok) throw new Error("Failed to fetch article");
  const json = await res.json();
  return {
    article: mapActivityToPost(json.data.article),
    comments: (json.data.comments ?? []).map(mapActivityToPost),
  };
}

export async function updateArticle(
  mid: string,
  fields: { body: string; title: string; summary: string },
): Promise<void> {
  const res = await apiFetch(`/api/item/${encodeURIComponent(mid)}/edit`, {
    method: "POST",
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? "Edit failed");
  }
}
 
export async function deleteArticle(mid: string): Promise<void> {
  const res = await apiFetch(`/api/item/${encodeURIComponent(mid)}/delete`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? "Delete failed");
  }
}
