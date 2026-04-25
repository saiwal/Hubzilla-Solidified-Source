import { createSignal } from "solid-js";
import { fetchNetworkStream } from "../api/api";
import type { NetworkParams } from "../api/api";
import { buildThreadTree } from "@/shared/lib/thread";
import type { ThreadNode } from "@/shared/lib/thread";
import type { Post } from "@/shared/types/post.types";
import { updateInterval } from "@/shared/store/auth-store";
import {
  apiToggleLike,
  apiToggleDislike,
  apiToggleRepeat,
  apiToggleStar,
  apiCreateComment,
  apiDeleteItem,
  apiEditItem,
  apiCreatePost,
} from '../api/api';
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
// ── Reaction toggles (replace your existing handleLike/Dislike/Repeat) ────────
// Pattern: optimistic update → real API call → rollback on failure
// The API now returns fresh counts, so we sync those in too.

export async function handleLike(uuid: string) {
  const isUndo = activated.has(`${uuid}:like`);
  isUndo ? activated.delete(`${uuid}:like`) : activated.add(`${uuid}:like`);

  setPosts(prev => updateNode(prev, uuid, n => ({
    ...n,
    likeCount: n.likeCount + (isUndo ? -1 : 1),
    viewerLiked: !isUndo,
  })));

  try {
    const res = await apiToggleLike(uuid);
    // Sync server counts (handles race conditions)
    setPosts(prev => updateNode(prev, uuid, n => ({
      ...n,
      likeCount:    res.like_count,
      dislikeCount: res.dislike_count,
    })));
  } catch {
    // Rollback
    isUndo ? activated.add(`${uuid}:like`) : activated.delete(`${uuid}:like`);
    setPosts(prev => updateNode(prev, uuid, n => ({
      ...n,
      likeCount: n.likeCount + (isUndo ? 1 : -1),
      viewerLiked: isUndo,
    })));
  }
}

export async function handleDislike(uuid: string) {  console.log('handleDislike called with:', uuid);
  const isUndo = activated.has(`${uuid}:dislike`);
  isUndo ? activated.delete(`${uuid}:dislike`) : activated.add(`${uuid}:dislike`);

  setPosts(prev => updateNode(prev, uuid, n => ({
    ...n,
    dislikeCount: n.dislikeCount + (isUndo ? -1 : 1),
    viewerDisliked: !isUndo,
  })));

  try {
    const res = await apiToggleDislike(uuid);
    setPosts(prev => updateNode(prev, uuid, n => ({
      ...n,
      likeCount:    res.like_count,
      dislikeCount: res.dislike_count,
    })));
  } catch {
    isUndo ? activated.add(`${uuid}:dislike`) : activated.delete(`${uuid}:dislike`);
    setPosts(prev => updateNode(prev, uuid, n => ({
      ...n,
      dislikeCount: n.dislikeCount + (isUndo ? 1 : -1),
      viewerDisliked: isUndo,
    })));
  }
}

export async function handleRepeat(uuid: string) {
  const isUndo = activated.has(`${uuid}:announce`);
  isUndo ? activated.delete(`${uuid}:announce`) : activated.add(`${uuid}:announce`);

  setPosts(prev => updateNode(prev, uuid, n => ({
    ...n,
    repeatCount: n.repeatCount + (isUndo ? -1 : 1),
    viewerRepeated: !isUndo,
  })));

  try {
    const res = await apiToggleRepeat(uuid);
    setPosts(prev => updateNode(prev, uuid, n => ({
      ...n,
      repeatCount:    res.announce_count,
    })));
  } catch {
    isUndo ? activated.add(`${uuid}:announce`) : activated.delete(`${uuid}:announce`);
    setPosts(prev => updateNode(prev, uuid, n => ({
      ...n,
      repeatCount: n.repeatCount + (isUndo ? 1 : -1),
      viewerRepeated: isUndo,
    })));
  }
}

// ── Star toggle ───────────────────────────────────────────────────────────────
// Optimistic: flip the 'starred' flag in flags[]

export async function handleStar(mid: string) {
  const currentlyStarred = posts().find(p => p.mid === mid)
    ?.flags.includes('starred') ?? false;

  setPosts(prev => updateNode(prev, mid, n => ({
    ...n,
    flags: currentlyStarred
      ? n.flags.filter(f => f !== 'starred')
      : [...n.flags, 'starred'],
  })));

  try {
    await apiToggleStar(mid);
  } catch {
    // Rollback
    setPosts(prev => updateNode(prev, mid, n => ({
      ...n,
      flags: currentlyStarred
        ? [...n.flags, 'starred']
        : n.flags.filter(f => f !== 'starred'),
    })));
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
// Optimistic: remove from list immediately

export async function handleDelete(mid: string) {
  const snapshot = posts();
  setPosts(prev => prev.filter(p => p.mid !== mid));

  try {
    await apiDeleteItem(mid);
  } catch {
    setPosts(snapshot); // Rollback
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────────

export async function handleEdit(mid: string, body: string, title = '') {
  const prev = posts().find(p => p.mid === mid);

  setPosts(prevPosts => updateNode(prevPosts, mid, n => ({
    ...n,
    body,
    title,
  })));

  try {
    await apiEditItem(mid, body, title);
  } catch {
    if (prev) {
      setPosts(prevPosts => updateNode(prevPosts, mid, () => prev));
    }
  }
}

// ── Comment ───────────────────────────────────────────────────────────────────
// Same optimistic pattern as your existing handleComment,
// but now delegates to the real API endpoint

export async function handleComment(
  parentMid: string,
  body: string,
  authorName: string,
  authorAvatar: string,
): Promise<void> {
  const tempMid = crypto.randomUUID();
  const tempComment: ThreadNode = {
    uuid: tempMid,
    id: tempMid,
    mid: tempMid,
    parent_mid: parentMid,
    thr_parent: parentMid,
    top_mid: parentMid,
    parent: parentMid,
    body,
    title: '',
    authorName,
    authorAvatar,
    authorUrl: '',
    created: new Date().toISOString().replace('T', ' ').slice(0, 19),
    verb: 'Create',
    obj_type: 'Note',
    flags: [],
    permalink: '',
    likeCount: 0,
    dislikeCount: 0,
    repeatCount: 0,
    viewerLiked: false,
    viewerDisliked: false,
    viewerRepeated: false,
    item_thread_top: 0,
    children: [],
  };

  // Add temp comment immediately
  setPosts(prev => updateNode(prev, parentMid, n => ({
    ...n,
    children: [...n.children, tempComment],
    comment_count: (n.commentCount ?? 0) + 1,
  })));

  try {
    const res = await apiCreateComment(parentMid, body);
    // Replace temp with real mid
    setPosts(prev => updateNode(prev, parentMid, n => ({
      ...n,
      children: n.children.map(c =>
        c.mid === tempMid ? { ...c, mid: res.mid, uuid: res.uuid, id: res.iid.toString() } : c
      ),
    })));
  } catch {
    // Rollback
    setPosts(prev => updateNode(prev, parentMid, n => ({
      ...n,
      children: n.children.filter(c => c.uuid !== tempMid),
      commentCount: Math.max(0, (n.commentCount ?? 1) - 1),
    })));
  }
}

// ── Create post (for composer) ────────────────────────────────────────────────

export async function handleCreatePost(params: {
  profile_uid: number;
  body: string;
  title?: string;
  scope?: 'public' | 'contacts' | 'private';
}): Promise<void> {
  // No optimistic insert for new posts — just trigger a poll after success
  // so the real item appears with its server-assigned mid/uuid
  try {
    await apiCreatePost(params);
    await checkForNew(); // your existing polling function
  } catch (err) {
    console.error('Create post failed', err);
    throw err; // let the composer component show an error state
  }
}
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
		commentCount: p.commentCount,
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
  uuid: string,
  updater: (n: ThreadNode) => ThreadNode,
): ThreadNode[] {
  return nodes.map((n) => {
    if (n.uuid === uuid) return updater(n);
    if (n.children.length)
      return { ...n, children: updateNode(n.children, uuid, updater) };
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

