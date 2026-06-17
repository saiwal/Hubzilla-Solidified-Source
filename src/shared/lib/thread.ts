import type { Post } from "../types/post.types";

export interface ThreadNode extends Post {
  children: ThreadNode[];
}

function makeDeletedPlaceholder(mid: string, attachToMid: string, created: string): ThreadNode {
  return {
    id: mid, uuid: "", mid, parent_mid: attachToMid, thr_parent: attachToMid,
    top_mid: attachToMid, parent: attachToMid, body: "", title: "",
    authorName: "", authorAvatar: "", authorUrl: "", created, item_thread_top: 0,
    flags: ["deleted_placeholder"], permalink: "", children: [],
    likeCount: 0, dislikeCount: 0, repeatCount: 0,
    viewerLiked: false, viewerDisliked: false, viewerRepeated: false,
  };
}

export function buildThreadTree(posts: Post[]): ThreadNode[] {
  const map = new Map<string, ThreadNode>();
  const roots: ThreadNode[] = [];

  posts.forEach((post) => {
    map.set(post.mid, { ...post, children: [] });
  });

  // First pass: find comments whose direct parent (thr_parent) is missing from
  // the map — these are replies to deleted comments. Create a placeholder node
  // for each missing parent so they render nested rather than as top-level roots.
  const orphanInfo = new Map<string, { attachToMid: string; created: string }>();
  map.forEach((node) => {
    const isRoot = node.item_thread_top === 1 || node.mid === node.top_mid;
    if (isRoot) return;
    const parentKey = node.thr_parent || node.parent_mid;
    // Only synthesize a placeholder when thr_parent points to a specific
    // intermediate comment that is absent from the map. If thr_parent equals
    // parent_mid the comment is a direct reply to the thread root — the root
    // is simply not in this call, not a deleted item.
    if (
      node.thr_parent &&
      node.thr_parent !== node.parent_mid &&
      !map.has(parentKey) &&
      !orphanInfo.has(parentKey)
    ) {
      orphanInfo.set(parentKey, { attachToMid: node.parent_mid || parentKey, created: node.created });
    }
  });
  orphanInfo.forEach(({ attachToMid, created }, missingMid) => {
    map.set(missingMid, makeDeletedPlaceholder(missingMid, attachToMid, created));
  });

  map.forEach((node) => {
    // Use item_thread_top flag as the authoritative root signal —
    // top_mid / message_top is unreliable depending on server response shape
    const isRoot = node.item_thread_top === 1 || node.mid === node.top_mid;

    if (isRoot) {
      roots.push(node);
      return;
    }

    // thr_parent is the direct parent mid in Hubzilla's DB
    const parentKey = node.thr_parent || node.parent_mid;
    const parent = map.get(parentKey);

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortChildrenAsc = (nodes: ThreadNode[]): ThreadNode[] =>
    nodes
      .sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime())
      .map((node) => ({ ...node, children: sortChildrenAsc(node.children) }));

  return roots.map((node) => ({ ...node, children: sortChildrenAsc(node.children) }));
}

export function flattenThread(node: ThreadNode): Post[] {
  return [node, ...node.children.flatMap(flattenThread)];
}

const REACTION_VERBS = new Set(['Like', 'Dislike', 'Announce', 'Accept', 'Reject', 'TentativeAccept', 'Add', 'Remove']);

export function isDeletedStub(node: Pick<Post, 'flags'>): boolean {
  return node.flags.includes('deleted') || node.flags.includes('deleted_placeholder');
}

export function countAllComments(nodes: ThreadNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (isDeletedStub(node)) {
      count += countAllComments(node.children);
    } else if (!REACTION_VERBS.has(node.verb ?? '')) {
      count += 1 + countAllComments(node.children);
    }
  }
  return count;
}
