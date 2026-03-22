import { createSignal } from "solid-js";
import { fetchNetworkStream, toggleVerb, postComment } from "./api";
import { buildThreadTree } from "../../core/utils/thread";
import type { ThreadNode } from "../../core/utils/thread";

const [posts, setPosts] = createSignal<ThreadNode[]>([]);
const [loading, setLoading] = createSignal(false);
const [profileUid, setProfileUid] = createSignal<number>(0);

export async function loadNetwork() {
  setLoading(true);
  try {
    const data = await fetchNetworkStream();
    const threads = buildThreadTree(data);
    setPosts(threads);
    if (data.length && data[0].profileUid) setProfileUid(data[0].profileUid);
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
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({ ...n, likeCount: n.likeCount + 1 }))
  );
  try {
    await toggleVerb(iid, 'like');
  } catch (err) {
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({ ...n, likeCount: Math.max(0, n.likeCount - 1) }))
    );
    console.error('Like failed', err);
  }
}

export async function handleDislike(mid: string, iid: number) {
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({ ...n, dislikeCount: n.dislikeCount + 1 }))
  );
  try {
    await toggleVerb(iid, 'dislike');
  } catch (err) {
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({ ...n, dislikeCount: Math.max(0, n.dislikeCount - 1) }))
    );
    console.error('Dislike failed', err);
  }
}

export async function handleRepeat(mid: string, iid: number) {
  setPosts((prev) =>
    updateNode(prev, mid, (n) => ({ ...n, repeatCount: n.repeatCount + 1 }))
  );
  try {
    await toggleVerb(iid, 'announce');
  } catch (err) {
    setPosts((prev) =>
      updateNode(prev, mid, (n) => ({ ...n, repeatCount: Math.max(0, n.repeatCount - 1) }))
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
