import { createSignal } from "solid-js";
import { fetchNetworkStream, toggleVerb, postComment } from "./api";
import type { NetworkParams } from "./api";
import { buildThreadTree } from "../../core/utils/thread";
import type { ThreadNode } from "../../core/utils/thread";

const [posts, setPosts] = createSignal<ThreadNode[]>([]);
const [loading, setLoading] = createSignal(false);
const [profileUid, setProfileUid] = createSignal<number>(0);
const [params, setParams] = createSignal<NetworkParams>({});

// Tracks which (mid:verb) the user has already activated — used to detect toggles
const activated = new Set<string>();

export async function loadNetwork(newParams?: NetworkParams) {
  if (newParams !== undefined) setParams(newParams);
  setLoading(true);
  try {
    const data = await fetchNetworkStream(params());
    const threads = buildThreadTree(data);
    setPosts(threads);
    if (data.length && data[0].profileUid) setProfileUid(data[0].profileUid);
    // Pre-populate activated set from server data
    activated.clear();
    data.forEach(p => {
      if (p.viewerLiked)    activated.add(`${p.mid}:like`);
      if (p.viewerDisliked) activated.add(`${p.mid}:dislike`);
      if (p.viewerRepeated) activated.add(`${p.mid}:announce`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function updateNode(
  nodes: ThreadNode[],
  mid: string,
  updater: (n: ThreadNode) => ThreadNode
): ThreadNode[] {
  return nodes.map((n) => {
    if (n.mid === mid) return updater(n);
    if (n.children.length)
      return { ...n, children: updateNode(n.children, mid, updater) };
    return n;
  });
}

// ─── Actions ────────────────────────────────────────────────────────────────

export async function handleLike(mid: string, iid: number) {
  const key = `${mid}:like`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({ ...n, likeCount: n.likeCount + (isUndo ? -1 : 1) }))
  );
  try {
    await toggleVerb(iid, 'like');
  } catch (err) {
    // Roll back
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({ ...n, likeCount: n.likeCount + (isUndo ? 1 : -1) }))
    );
    console.error('Like failed', err);
  }
}

export async function handleDislike(mid: string, iid: number) {
  const key = `${mid}:dislike`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({ ...n, dislikeCount: n.dislikeCount + (isUndo ? -1 : 1) }))
  );
  try {
    await toggleVerb(iid, 'dislike');
  } catch (err) {
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({ ...n, dislikeCount: n.dislikeCount + (isUndo ? 1 : -1) }))
    );
    console.error('Dislike failed', err);
  }
}

export async function handleRepeat(mid: string, iid: number) {
  const key = `${mid}:announce`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({ ...n, repeatCount: n.repeatCount + (isUndo ? -1 : 1) }))
  );
  try {
    await toggleVerb(iid, 'announce');
  } catch (err) {
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({ ...n, repeatCount: n.repeatCount + (isUndo ? 1 : -1) }))
    );
    console.error('Repeat failed', err);
  }
}

export async function handleComment(
  parentMid: string,
  parentIid: number,
  body: string,
  authorName: string,
  authorAvatar: string,
): Promise<void> {
  // Optimistically append the comment immediately
  const tempComment: ThreadNode = {
    id: crypto.randomUUID(),
    mid: crypto.randomUUID(),
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

  setPosts(prev =>
    updateNode(prev, parentMid, n => ({
      ...n,
      children: [...n.children, tempComment],
    }))
  );

  // Fire and forget — server saves it in background
  postComment({ body, parent_iid: parentIid, profile_uid: profileUid() }).catch(err => {
    console.error('Comment failed', err);
    // Roll back on failure
    setPosts(prev =>
      updateNode(prev, parentMid, n => ({
        ...n,
        children: n.children.filter(c => c.mid !== tempComment.mid),
      }))
    );
  });
}

export { posts, loading, profileUid };
