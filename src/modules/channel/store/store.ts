import { createSignal } from "solid-js";
import { fetchChannelPosts, toggleVerb, postComment as apiPostComment, type ChannelParams } from "../api/api";
import { buildThreadTree, type ThreadNode } from "../../../shared/hooks/thread";
// import { toggleVerb, postComment as apiPostComment } from "../api/api";

const [posts, setPosts]       = createSignal<ThreadNode[]>([]);
const [loading, setLoading]   = createSignal(false);
const [nickname, setNickname] = createSignal('');
const [params, setParams]     = createSignal<ChannelParams>({});
const [profileUid, setProfileUid] = createSignal<number>(0);

const activated = new Set<string>();

export async function loadChannel(nick: string, newParams?: ChannelParams) {
  setNickname(nick);
  if (newParams !== undefined) setParams(newParams);
  setLoading(true);
  try {
    const data = await fetchChannelPosts(nick, params());
    const threads = buildThreadTree(data);
    setPosts(threads);
    if (data.length && data[0].profileUid) setProfileUid(data[0].profileUid);
    activated.clear();
    data.forEach(p => {
      if (p.viewerLiked)    activated.add(`${p.mid}:like`);
      if (p.viewerDisliked) activated.add(`${p.mid}:dislike`);
      if (p.viewerRepeated) activated.add(`${p.mid}:announce`);
    });
  } catch (err) {
    console.error('loadChannel failed', err);
  } finally {
    setLoading(false);
  }
}

// ─── Node updater (identical helper to network store) ────────────────────────

function updateNode(
  nodes: ThreadNode[],
  mid: string,
  updater: (n: ThreadNode) => ThreadNode,
): ThreadNode[] {
  return nodes.map(n => {
    if (n.mid === mid) return updater(n);
    if (n.children.length)
      return { ...n, children: updateNode(n.children, mid, updater) };
    return n;
  });
}

// ─── Actions (same API calls as network, different posts signal) ─────────────

export async function handleLike(mid: string, iid: number) {
  const key = `${mid}:like`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts(prev => updateNode(prev, mid, n => ({ ...n, likeCount: n.likeCount + (isUndo ? -1 : 1) })));
  try {
    await toggleVerb(iid, 'like');
  } catch (err) {
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts(prev => updateNode(prev, mid, n => ({ ...n, likeCount: n.likeCount + (isUndo ? 1 : -1) })));
    throw err;
  }
}

export async function handleDislike(mid: string, iid: number) {
  const key = `${mid}:dislike`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts(prev => updateNode(prev, mid, n => ({ ...n, dislikeCount: n.dislikeCount + (isUndo ? -1 : 1) })));
  try {
    await toggleVerb(iid, 'dislike');
  } catch (err) {
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts(prev => updateNode(prev, mid, n => ({ ...n, dislikeCount: n.dislikeCount + (isUndo ? 1 : -1) })));
    throw err;
  }
}

export async function handleRepeat(mid: string, iid: number) {
  const key = `${mid}:announce`;
  const isUndo = activated.has(key);
  isUndo ? activated.delete(key) : activated.add(key);
  setPosts(prev => updateNode(prev, mid, n => ({ ...n, repeatCount: n.repeatCount + (isUndo ? -1 : 1) })));
  try {
    await toggleVerb(iid, 'announce');
  } catch (err) {
    isUndo ? activated.add(key) : activated.delete(key);
    setPosts(prev => updateNode(prev, mid, n => ({ ...n, repeatCount: n.repeatCount + (isUndo ? 1 : -1) })));
    throw err;
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
    id:              crypto.randomUUID(),
    mid:             crypto.randomUUID(),
    parent_mid:      parentMid,
    thr_parent:      parentMid,
    top_mid:         parentMid,
    parent:          parentMid,
    body,
    title:           '',
    authorName,
    authorAvatar,
    authorUrl:       '',
    created:         new Date().toISOString().replace('T', ' ').slice(0, 19),
    verb:            'Create',
    obj_type:        'Note',
    flags:           [],
    permalink:       '',
    likeCount:       0,
    dislikeCount:    0,
    repeatCount:     0,
    viewerLiked:     false,
    viewerDisliked:  false,
    viewerRepeated:  false,
    item_thread_top: 0,
    children:        [],
  };

  setPosts(prev =>
    updateNode(prev, parentMid, n => ({ ...n, children: [...n.children, tempComment] }))
  );

  apiPostComment({ body, parent_iid: parentIid, profile_uid: profileUid() }).catch(err => {
    console.error('Comment failed', err);
    setPosts(prev =>
      updateNode(prev, parentMid, n => ({
        ...n,
        children: n.children.filter(c => c.mid !== tempComment.mid),
      }))
    );
  });
}

export { posts, loading, nickname };
