// src/modules/network/store/store.ts
import { createSignal } from "solid-js";
import { createStreamStore, updateNode } from "@/shared/stream/store/createStreamStore";
import { fetchNetworkStream, toggleVerb, postComment, apiDeleteItem as deleteItem} from "../api/api";
import type { NetworkParams } from "../api/api";
import type { ThreadNode } from "@/shared/lib/thread";

// ── viewMode (stays network-local) ───────────────────────────────────────────
export type ViewMode = "feed" | "masonry" | "list" | "inbox";
const storedView = (localStorage.getItem("network:viewMode") ?? "feed") as ViewMode;
const [viewMode, setViewMode] = createSignal<ViewMode>(storedView);
export function changeView(v: ViewMode) {
  localStorage.setItem("network:viewMode", v);
  setViewMode(v);
}
export { viewMode };

// ── store instance ────────────────────────────────────────────────────────────
const store = createStreamStore<NetworkParams>(fetchNetworkStream);

export const {
  posts, loading, loadingMore, hasMore, newPosts, profileUid,
  loadMore, flushNewPosts, stopPolling,
} = store;

export function resetPosts() { store.reset(); }
export function loadNetwork(params?: NetworkParams) { return store.load(params); }

// ── iid lookup ────────────────────────────────────────────────────────────────
// All call sites only have `mid` (or `uuid` — both are the same field in
// practice). We resolve `iid` here so callers stay at 1-arg signatures.

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

// ── reactions — single-arg, iid resolved internally ──────────────────────────
export function handleLike(mid: string) {
  const iid = iidFor(mid);
  store.optimisticToggle(mid, "like", "likeCount", () => toggleVerb(iid, "like"));
}

export function handleDislike(mid: string) {
  const iid = iidFor(mid);
  store.optimisticToggle(mid, "dislike", "dislikeCount", () => toggleVerb(iid, "dislike"));
}

export function handleRepeat(mid: string) {
  const iid = iidFor(mid);
  store.optimisticToggle(mid, "announce", "repeatCount", () => toggleVerb(iid, "announce"));
}

export function handleStar(mid: string) {
  const iid = iidFor(mid);
  store.optimisticToggle(mid, "like", "likeCount", () => toggleVerb(iid, "star"));
}

export async function handleDelete(mid: string) {
  const iid = iidFor(mid);
  if (!iid) return;
  await deleteItem(iid);
  store.setPosts((prev) => prev.filter((p) => p.mid !== mid));
}

// ── comment ───────────────────────────────────────────────────────────────────
export async function handleComment(
  parentMid: string,
  body: string,
  authorName: string,
  authorAvatar: string,
): Promise<void> {
  const parentIid = iidFor(parentMid);

  const tempComment: ThreadNode = {
    uuid: crypto.randomUUID(),
    id: crypto.randomUUID(),
    mid: crypto.randomUUID(),
    parent_mid: parentMid,
    thr_parent: parentMid,
    top_mid: parentMid,
    parent: parentMid,
    body,
    title: "",
    authorName,
    authorAvatar,
    authorUrl: "",
    created: new Date().toISOString().replace("T", " ").slice(0, 19),
    verb: "Create",
    obj_type: "Note",
    flags: [],
    permalink: "",
    likeCount: 0,
    dislikeCount: 0,
    repeatCount: 0,
    viewerLiked: false,
    viewerDisliked: false,
    viewerRepeated: false,
    item_thread_top: 0,
    children: [],
  };

  store.setPosts((prev) =>
    updateNode(prev, parentMid, (n) => ({
      ...n,
      children: [...n.children, tempComment],
    })),
  );

  postComment({ body, parent_iid: parentIid, profile_uid: profileUid() }).catch(() => {
    store.setPosts((prev) =>
      updateNode(prev, parentMid, (n) => ({
        ...n,
        children: n.children.filter((c) => c.mid !== tempComment.mid),
      })),
    );
  });
}
