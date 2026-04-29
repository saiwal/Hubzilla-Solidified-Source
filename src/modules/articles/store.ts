// src/modules/articles/store.ts
import { createSignal } from "solid-js";
import { createStreamStore, updateNode } from "@/shared/stream/store/createStreamStore";
import { fetchArticles, postComment } from "./api";
import type { ThreadNode } from "@/shared/lib/thread";
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

// ── store instance ────────────────────────────────────────────────────────────
const store = createStreamStore<ArticleParams>(articlesFetcher);
const { handleLike, handleDislike, handleRepeat } = createActionHandlers(store);
export { handleLike, handleDislike, handleRepeat };

export const {
  posts, loading, loadingMore, hasMore, newPosts, profileUid,
  loadMore, flushNewPosts, stopPolling,
} = store;

// ── viewMode ──────────────────────────────────────────────────────────────────
const [viewMode, setViewMode] = createSignal<ViewMode>(
  (localStorage.getItem("articles:viewMode") ?? "list") as ViewMode
);
export function changeView(v: ViewMode) {
  localStorage.setItem("articles:viewMode", v);
  setViewMode(v);
}
export { viewMode };

export function resetPosts() { store.reset(); }

export async function loadArticles(nickname: string, params?: ArticleParams) {
  setNick(nickname);
  return store.load(params);
}

// ── iid lookup ────────────────────────────────────────────────────────────────
function findNode(nodes: ThreadNode[], mid: string): ThreadNode | undefined {
  for (const n of nodes) {
    if (n.mid === mid || n.uuid === mid) return n;
    if (n.children.length) {
      const found = findNode(n.children, mid);
      if (found) return found;
    }
  }
  return undefined;
}

function iidFor(mid: string): number {
  const node = findNode(store.posts(), mid);
  return node ? Number(node.id) : 0;
}



// ── comment ───────────────────────────────────────────────────────────────────
export async function handleComment(
  parentMid: string,
  body: string,
  authorName: string,
  authorAvatar: string,
): Promise<void> {
  const parentIid = iidFor(parentMid);
  const tempMid = crypto.randomUUID();

  const tempComment: ThreadNode = {
    uuid: tempMid, id: tempMid, mid: tempMid,
    parent_mid: parentMid, thr_parent: parentMid,
    top_mid: parentMid, parent: parentMid,
    body, title: "", authorName, authorAvatar, authorUrl: "",
    created: new Date().toISOString().replace("T", " ").slice(0, 19),
    verb: "Create", obj_type: "Note", flags: [], permalink: "",
    likeCount: 0, dislikeCount: 0, repeatCount: 0,
    viewerLiked: false, viewerDisliked: false, viewerRepeated: false,
    item_thread_top: 0, children: [],
  };

  store.setPosts((prev) =>
    updateNode(prev, parentMid, (n) => ({ ...n, children: [...n.children, tempComment] }))
  );

  postComment({ body, parent_iid: parentIid, profile_uid: profileUid() }).catch(() => {
    store.setPosts((prev) =>
      updateNode(prev, parentMid, (n) => ({
        ...n, children: n.children.filter((c) => c.mid !== tempMid),
      }))
    );
  });
}
