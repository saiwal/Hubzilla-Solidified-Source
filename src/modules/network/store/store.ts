import { createSignal } from "solid-js";
import { fetchNetworkStream, toggleVerb, postComment, toggleAnnounce } from "../api/api";
import type { NetworkParams } from "../api/api";
import { buildThreadTree } from "@/shared/lib/thread";
import type { ThreadNode } from "@/shared/lib/thread";
import type { Post } from "@/shared/types/post.types";
import { updateInterval } from "@/shared/store/auth-store";

const [posts, setPosts] = createSignal<ThreadNode[]>([]);
const [loading, setLoading] = createSignal(false);
const [loadingMore, setLoadingMore] = createSignal(false);
const [hasMore, setHasMore] = createSignal(true);
const [newPosts, setNewPosts] = createSignal<ThreadNode[]>([]);
const [profileUid, setProfileUid] = createSignal<number>(0);
const [params, setParams] = createSignal<NetworkParams>({});

export type ViewMode = "feed" | "masonry" | "list" | "inbox";

const storedView = (localStorage.getItem('network:viewMode') ?? 'feed') as ViewMode;
const [viewMode, setViewMode] = createSignal<ViewMode>(storedView);
// wrap setViewMode
export function changeView(v: ViewMode) {
  localStorage.setItem("network:viewMode", v);
  setViewMode(v);
}
export { viewMode };

let currentOffset = 0;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
const activated = new Set<string>();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function postToThreadNode(p: Post): ThreadNode {
  return {
    uuid: p.uuid,
    id: p.id,
    mid: p.mid,
    parent_mid: p.parent_mid,
    thr_parent: p.thr_parent,
    top_mid: p.top_mid,
    parent: p.parent_mid,
    body: p.body,
    title: p.title,
    authorName: p.authorName,
    authorAvatar: p.authorAvatar,
    authorUrl: p.authorUrl,
    created: p.created,
    verb: p.verb,
    obj_type: p.obj_type,
    flags: p.flags,
    permalink: p.permalink,
    likeCount: p.likeCount,
    dislikeCount: p.dislikeCount,
    repeatCount: p.repeatCount,
    viewerLiked: p.viewerLiked,
    viewerDisliked: p.viewerDisliked,
    viewerRepeated: p.viewerRepeated,
    item_thread_top: p.item_thread_top,
    children: [],
  };
}
function registerActivated(data: Post[]) {
  data.forEach((p) => {
    if (p.viewerLiked) activated.add(`${p.mid}:like`);
    if (p.viewerDisliked) activated.add(`${p.mid}:dislike`);
    if (p.viewerRepeated) activated.add(`${p.mid}:announce`);
  });
}

function updateNode(
  nodes: ThreadNode[],
  mid: string,
  updater: (n: ThreadNode) => ThreadNode,
): ThreadNode[] {
  return nodes.map((n) => {
    if (n.mid === mid) return updater(n);
    if (n.children.length)
      return { ...n, children: updateNode(n.children, mid, updater) };
    return n;
  });
}

// ─── Initial load ──────────────────────────────────────────────────────────
export async function loadNetwork(newParams?: NetworkParams) {
  if (newParams !== undefined) setParams(newParams);
  setLoading(true);
  setHasMore(true);
  currentOffset = 0;
  stopPolling();
  try {
    const result = await fetchNetworkStream({ ...params(), start: 0 });
    // in nouveau every item is flat, no thread tree needed
    const threads = result.nouveau
      ? result.items.map(postToThreadNode)
      : buildThreadTree(result.items);
    setPosts(threads);
    setNewPosts([]);
    currentOffset = result.rootCount;
    setHasMore(result.rootCount >= result.limit);
    if (result.items.length && result.items[0].profileUid) {
      setProfileUid(result.items[0].profileUid);
    }
    activated.clear();
    registerActivated(result.items);
    startPolling();
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}

export async function loadMore() {
  if (loadingMore() || !hasMore()) return;
  setLoadingMore(true);
  try {
    const result = await fetchNetworkStream({ ...params(), start: currentOffset });
    if (!result.items.length) {
      setHasMore(false);
      return;
    }
    const threads = result.nouveau
      ? result.items.map(postToThreadNode)
      : buildThreadTree(result.items);
    const existingMids = new Set(posts().map((t) => t.mid));
    const fresh = threads.filter((t) => !existingMids.has(t.mid));
    setPosts((prev) => [...prev, ...fresh]);
    currentOffset += result.rootCount;
    setHasMore(result.rootCount >= result.limit);
    registerActivated(result.items);
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingMore(false);
  }
}
// ─── Polling for new posts ────────────────────────────────────────────────────

function startPolling() {
	stopPolling();
  const schedule = () => {
    pollTimer = setTimeout(async () => {
      if (document.visibilityState === "visible") await checkForNew();
      schedule();
    }, updateInterval());
  };
  schedule();
}

function stopPolling() {
  if (pollTimer !== null) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
}

export function flushNewPosts() {
  setPosts((prev) => [...newPosts(), ...prev]);
  setNewPosts([]);
}
export function resetPosts() {
  setPosts([]);
  setHasMore(true);
  // setOffset(0);
}
// ─── Actions ─────────────────────────────────────────────────────────────────

export async function handleLike(mid: string, iid: number) {
  const key = `${mid}:like`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({
      ...n,
      likeCount: n.likeCount + (isUndo ? -1 : 1),
    })),
  );
  try {
    await toggleVerb(iid, "like");
  } catch (err) {
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({
        ...n,
        likeCount: n.likeCount + (isUndo ? 1 : -1),
      })),
    );
    console.error("Like failed", err);
  }
}

export async function handleDislike(mid: string, iid: number) {
  const key = `${mid}:dislike`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({
      ...n,
      dislikeCount: n.dislikeCount + (isUndo ? -1 : 1),
    })),
  );
  try {
    await toggleVerb(iid, "dislike");
  } catch (err) {
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({
        ...n,
        dislikeCount: n.dislikeCount + (isUndo ? 1 : -1),
      })),
    );
    console.error("Dislike failed", err);
  }
}

export async function handleRepeat(mid: string, parent:string) {
  const key = `${mid}:announce`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({
      ...n,
      repeatCount: n.repeatCount + (isUndo ? -1 : 1),
    })),
  );
  try {
    await toggleAnnounce(mid, parent, "announce");
  } catch (err) {
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({
        ...n,
        repeatCount: n.repeatCount + (isUndo ? 1 : -1),
      })),
    );
    console.error("Repeat failed", err);
  }
}

export async function handleComment(
  parentMid: string,
  parentIid: number,
  body: string,
  authorName: string,
  authorAvatar: string,
): Promise<void> {
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

  setPosts((prev) =>
    updateNode(prev, parentMid, (n) => ({
      ...n,
      children: [...n.children, tempComment],
    })),
  );

  postComment({ body, parent_iid: parentIid, profile_uid: profileUid() }).catch(
    (err) => {
      console.error("Comment failed", err);
      setPosts((prev) =>
        updateNode(prev, parentMid, (n) => ({
          ...n,
          children: n.children.filter((c) => c.mid !== tempComment.mid),
        })),
      );
    },
  );
}
async function checkForNew() {
  const topPost = newPosts()[0] ?? posts()[0];
  if (!topPost) return;
  const topDate = new Date(topPost.created.replace(" ", "T") + "Z");
  topDate.setSeconds(topDate.getSeconds() + 1);
  const dbegin = topDate.toISOString().slice(0, 19).replace("T", " ");
  try {
    const result = await fetchNetworkStream({ ...params(), start: 0, dbegin });
    if (!result.items.length) return;
    const threads = result.nouveau
      ? result.items.map(postToThreadNode)
      : buildThreadTree(result.items);
    const existingMids = new Set([
      ...posts().map((t) => t.mid),
      ...newPosts().map((t) => t.mid),
    ]);
    const fresh = threads.filter((t) => !existingMids.has(t.mid));
    if (fresh.length) setNewPosts((prev) => [...fresh, ...prev]);
  } catch (err) {
    console.error("Poll failed", err);
  }
}
export { posts, loading, loadingMore, hasMore, newPosts, profileUid };

