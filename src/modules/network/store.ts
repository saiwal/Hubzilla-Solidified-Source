// src/modules/network/store/store.ts
import { createSignal } from "solid-js";
import { storageGet, storageSet } from "@/shared/lib/storage";
import { createStreamStore, updateNode } from "@/shared/stream/store/createStreamStore";
import { fetchNetworkStream, postComment, apiDeleteItem as deleteItem} from "./api";
import type { NetworkParams } from "./api";
import type { ThreadNode } from "@/shared/lib/thread";
import { buildThreadTree } from "@/shared/lib/thread";
import { createActionHandlers, toggleVerb } from "@/shared/stream/store/actions-store";
import { fetchComments } from "@/shared/lib/item-api";
import { mapActivityToPost } from "@/shared/lib/activity.mapper";

// ── viewMode (stays network-local) ───────────────────────────────────────────
export type ViewMode = "feed" | "masonry" | "list" | "inbox";
const [viewMode, setViewMode] = createSignal<ViewMode>("feed");
storageGet<ViewMode>("network:viewMode", "feed").then(setViewMode);
export function changeView(v: ViewMode) {
  storageSet("network:viewMode", v);
  setViewMode(v);
}
export { viewMode };

// ── store instance ────────────────────────────────────────────────────────────
const store = createStreamStore<NetworkParams>(fetchNetworkStream);
const { handleLike, handleDislike, handleRepeat } = createActionHandlers(store);
export { handleLike, handleDislike, handleRepeat };

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
export function handleStar(mid: string) {
  const iid = iidFor(mid);
  store.optimisticToggle(mid, "like", "likeCount", () => toggleVerb(iid, "star"));
}

const REACTION_VERBS = new Set(['Like', 'Dislike', 'Announce', 'Accept', 'Reject', 'TentativeAccept', 'Add', 'Remove']);

export async function loadComments(mid: string, uuid: string): Promise<void> {
  const result = await fetchComments(uuid);
  const comments = (result.comments ?? []).filter((a: any) => !REACTION_VERBS.has(a.verb));
  const nodes = buildThreadTree(comments.map(mapActivityToPost));
  store.setNodeChildren(mid, nodes);
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
