import { createSignal } from "solid-js";
import { fetchArticles } from "./api";
import type { Post } from "@/shared/types/post.types";
// import { pageSize } from "@/shared/store/auth-store";

const [articles, setArticles] = createSignal<Post[]>([]);
const [loading, setLoading] = createSignal(false);
const [loadingMore, setLoadingMore] = createSignal(false);
const [hasMore, setHasMore] = createSignal(true);
const [currentNick, setCurrentNick] = createSignal("");

let currentOffset = 0;

export async function loadArticles(
  nick: string,
  params: { search?: string; tag?: string; cat?: string } = {},
) {
  setCurrentNick(nick);
  setLoading(true);
  setHasMore(true);
  currentOffset = 0;
  try {
    const res = await fetchArticles(nick, { start: 0, ...params });
    setArticles(res.articles);
    currentOffset = res.meta.root_count;
    setHasMore(res.meta.root_count >= res.meta.limit);
  } catch (e) {
    console.error(e);
  } finally {
    setLoading(false);
  }
}

export async function loadMoreArticles(
  params: { search?: string; tag?: string; cat?: string } = {},
) {
  if (loadingMore() || !hasMore()) return;
  setLoadingMore(true);
  try {
    const res = await fetchArticles(currentNick(), {
      start: currentOffset,
      ...params,
    });
    if (!res.articles.length) {
      setHasMore(false);
      return;
    }
    const seen = new Set(articles().map((a) => a.mid));
    setArticles((prev) => [
      ...prev,
      ...res.articles.filter((a: Post) => !seen.has(a.mid)),
    ]);
    currentOffset += res.meta.root_count;
    setHasMore(res.meta.root_count >= res.meta.limit);
  } catch (e) {
    console.error(e);
  } finally {
    setLoadingMore(false);
  }
}

export { articles, loading, loadingMore, hasMore };
