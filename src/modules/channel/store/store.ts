import { createSignal } from "solid-js";
import { fetchChannelPosts, toggleVerb, postComment } from "../api/api";
import type { ChannelParams } from "../api/api";
import { buildThreadTree } from "@/shared/lib/thread";
import type { ThreadNode } from "@/shared/lib/thread";
import type { Post } from "@/shared/types/post.types";
import { updateInterval } from "@/shared/store/auth-store";

// ─── State ────────────────────────────────────────────────────────────────────

const [posts, setPosts]           = createSignal<ThreadNode[]>([]);
const [loading, setLoading]       = createSignal(false);
const [loadingMore, setLoadingMore] = createSignal(false);
const [hasMore, setHasMore]       = createSignal(true);
const [newPosts, setNewPosts]     = createSignal<ThreadNode[]>([]);
const [profileUid, setProfileUid] = createSignal<number>(0);
const [nick, setNick]             = createSignal<string>('');
const [params, setParams]         = createSignal<ChannelParams>({});

let currentOffset = 0;
let pollTimer: ReturnType<typeof setTimeout> | null = null;
const activated = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function postToThreadNode(p: Post): ThreadNode {
  return {
    uuid:            p.uuid,
    id:              p.id,
    mid:             p.mid,
    parent_mid:      p.parent_mid,
    thr_parent:      p.thr_parent,
    top_mid:         p.top_mid,
    parent:          p.parent_mid,
    body:            p.body,
    title:           p.title,
    authorName:      p.authorName,
    authorAvatar:    p.authorAvatar,
    authorUrl:       p.authorUrl,
    created:         p.created,
    verb:            p.verb,
    obj_type:        p.obj_type,
    flags:           p.flags,
    permalink:       p.permalink,
    likeCount:       p.likeCount,
    dislikeCount:    p.dislikeCount,
    repeatCount:     p.repeatCount,
    viewerLiked:     p.viewerLiked,
    viewerDisliked:  p.viewerDisliked,
    viewerRepeated:  p.viewerRepeated,
    item_thread_top: p.item_thread_top,
    children:        [],
  };
}

function registerActivated(items: Post[]) {
  items.forEach((p) => {
    if (p.viewerLiked)    activated.add(`${p.mid}:like`);
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

// ─── Load ─────────────────────────────────────────────────────────────────────

export async function loadChannel(nickname: string, newParams?: ChannelParams) {
  setNick(nickname);
  if (newParams !== undefined) setParams(newParams);
  setLoading(true);
  setHasMore(true);
  currentOffset = 0;
  stopPolling();
  try {
    const { items, rootCount, limit, nouveau } = await fetchChannelPosts(
      nickname,
      { ...params(), start: 0 },
    );
    const threads = nouveau
      ? items.map(postToThreadNode)
      : buildThreadTree(items);
    setPosts(threads);
    setNewPosts([]);
    currentOffset = rootCount;
    setHasMore(rootCount >= limit);
    if (items.length && items[0].profileUid) {
      setProfileUid(items[0].profileUid);
    }
    activated.clear();
    registerActivated(items);
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
    const { items, rootCount, limit, nouveau } = await fetchChannelPosts(
      nick(),
      { ...params(), start: currentOffset },
    );
    if (!items.length) {
      setHasMore(false);
      return;
    }
    const threads = nouveau
      ? items.map(postToThreadNode)
      : buildThreadTree(items);
    const existingMids = new Set(posts().map((t) => t.mid));
    const fresh = threads.filter((t) => !existingMids.has(t.mid));
    setPosts((prev) => [...prev, ...fresh]);
    currentOffset += rootCount;
    setHasMore(rootCount >= limit);
    registerActivated(items);
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingMore(false);
  }
}

export function resetPosts() {
  setPosts([]);
  setHasMore(true);
  currentOffset = 0;
}

export function flushNewPosts() {
  setPosts((prev) => [...newPosts(), ...prev]);
  setNewPosts([]);
}

// ─── Polling ──────────────────────────────────────────────────────────────────

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

async function checkForNew() {
  const topPost = newPosts()[0] ?? posts()[0];
  if (!topPost) return;
  const topDate = new Date(topPost.created.replace(" ", "T") + "Z");
  topDate.setSeconds(topDate.getSeconds() + 1);
  const dbegin = topDate.toISOString().slice(0, 19).replace("T", " ");
  try {
    const { items, nouveau } = await fetchChannelPosts(
      nick(),
      { ...params(), start: 0, dbegin },
    );
    if (!items.length) return;
    const threads = nouveau
      ? items.map(postToThreadNode)
      : buildThreadTree(items);
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

// ─── Actions ──────────────────────────────────────────────────────────────────

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

export async function handleRepeat(mid: string, iid: number) {
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
    await toggleVerb(iid, "announce");
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
    uuid:            crypto.randomUUID(),
    id:              crypto.randomUUID(),
    mid:             crypto.randomUUID(),
    parent_mid:      parentMid,
    thr_parent:      parentMid,
    top_mid:         parentMid,
    parent:          parentMid,
    body,
    title:           "",
    authorName,
    authorAvatar,
    authorUrl:       "",
    created:         new Date().toISOString().replace("T", " ").slice(0, 19),
    verb:            "Create",
    obj_type:        "Note",
    flags:           [],
    permalink:       "",
    likeCount:       0,
    dislikeCount:    0,
    repeatCount:     0,
    viewerLiked:     false,
    viewerDisliked:  false,
    viewerRepeated:  false,
    item_thread_top: 0,
    children:        [],
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

// ─── Exports ──────────────────────────────────────────────────────────────────

export { posts, loading, loadingMore, hasMore, newPosts, profileUid };
