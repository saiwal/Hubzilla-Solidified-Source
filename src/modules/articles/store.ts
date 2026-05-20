// src/modules/articles/store.ts
import { createSignal } from "solid-js";
import { storageGet, storageSet } from "@/shared/lib/storage";
import { createStreamStore } from "@/shared/stream/store/createStreamStore";
import { fetchArticles } from "./api";
import type { StreamResult, StreamParams } from "@/shared/stream/store/createStreamStore";
import { createActionHandlers } from "@/shared/stream/store/actions-store";
import type { ViewMode } from "@/shared/stream/types";

export interface ArticleParams extends StreamParams {
  search?: string;
  tag?: string;
  cat?: string;
}

// ── nick signal ───────────────────────────────────────────────────────────────
const [nick, setNick] = createSignal("");
export { nick };

// ── fetcher adapter ───────────────────────────────────────────────────────────
async function articlesFetcher(params: ArticleParams): Promise<StreamResult> {
  const res = await fetchArticles(nick(), params);
  return {
    items: res.articles,
    rootCount: res.meta.root_count,
    limit: res.meta.limit,
    nouveau: false,
  };
}

// ── active filters ────────────────────────────────────────────────────────────
const [activeCategory, setActiveCategory] = createSignal<string>("");
const [activeTag, setActiveTag] = createSignal<string>("");
export { activeCategory, activeTag };

export function setArticleFilter(type: "cat" | "tag", value: string) {
  if (type === "cat") {
    const next = activeCategory() === value ? "" : value;
    setActiveCategory(next);
    setActiveTag("");
    store.reset();
    store.load({ cat: next, tag: "" });
  } else {
    const next = activeTag() === value ? "" : value;
    setActiveTag(next);
    setActiveCategory("");
    store.reset();
    store.load({ cat: "", tag: next });
  }
}

export function clearArticleFilter() {
  setActiveCategory("");
  setActiveTag("");
  store.reset();
  store.load({});
}

// ── viewMode ──────────────────────────────────────────────────────────────────
const [viewMode, setViewMode] = createSignal<ViewMode>("list");
storageGet<ViewMode>("articles:viewMode", "list").then(setViewMode);
export function changeView(v: ViewMode) {
  storageSet("articles:viewMode", v);
  setViewMode(v);
}
export { viewMode };

// ── store instance ────────────────────────────────────────────────────────────
const store = createStreamStore<ArticleParams>(articlesFetcher);
export const {
  posts, loading, loadingMore, hasMore, newPosts, profileUid,
  loadMore, flushNewPosts, stopPolling,
} = store;

export function resetPosts() { store.reset(); }
export async function loadArticles(nickname: string, params?: ArticleParams) {
  setNick(nickname);
  return store.load(params);
}

// ── actions ───────────────────────────────────────────────────────────────────
export const {
  handleLike, handleDislike, handleRepeat,
  handleStar, handleDelete,
  handleComment, loadComments,
} = createActionHandlers(store);
