// src/modules/channel/store/store.ts
import { createSignal } from "solid-js";
import { createStreamStore, updateNode } from "@/shared/stream/store/createStreamStore";
import { fetchChannelPosts, toggleVerb, postComment } from "../api/api";
import type { ChannelParams, ChannelStreamResult } from "../api/api";
import type { ThreadNode } from "@/shared/lib/thread";

// ── nick signal (channel-specific, not part of generic store) ─────────────────
const [nick, setNick] = createSignal<string>("");
export { nick };

// ── fetcher adapter: createStreamStore expects (params) => StreamResult ───────
// ChannelParams doesn't carry the nick, so we close over the nick signal.
async function channelFetcher(params: ChannelParams): Promise<ChannelStreamResult> {
  return fetchChannelPosts(nick(), params);
}

// ── store instance ────────────────────────────────────────────────────────────
const store = createStreamStore<ChannelParams>(channelFetcher);

export const {
  posts, loading, loadingMore, hasMore, newPosts, profileUid,
  loadMore, flushNewPosts, stopPolling,
} = store;
export type ViewMode = "feed" | "masonry" | "list" | "inbox";
const [viewMode, setViewMode] = createSignal<ViewMode>(
  (localStorage.getItem("channel:viewMode") ?? "masonry") as ViewMode
);
export function changeView(v: ViewMode) {
  localStorage.setItem("channel:viewMode", v);
  setViewMode(v);
}
export { viewMode };
export function resetPosts() { store.reset(); }

export async function loadChannel(nickname: string, params?: ChannelParams) {
  setNick(nickname);
  return store.load(params);
}

// ── iid lookup (same pattern as network store) ────────────────────────────────
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

// ── reactions ─────────────────────────────────────────────────────────────────
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
    updateNode(prev, parentMid, (n) => ({
      ...n, children: [...n.children, tempComment],
    })),
  );

  postComment({ body, parent_iid: parentIid, profile_uid: profileUid() }).catch(() => {
    store.setPosts((prev) =>
      updateNode(prev, parentMid, (n) => ({
        ...n, children: n.children.filter((c) => c.mid !== tempMid),
      })),
    );
  });
}
