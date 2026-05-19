import type { Post } from "../types/post.types";

export interface ThreadNode extends Post {
  children: ThreadNode[];
}

export function buildThreadTree(posts: Post[]): ThreadNode[] {
  const map = new Map<string, ThreadNode>();
  const roots: ThreadNode[] = [];

  posts.forEach((post) => {
    map.set(post.mid, { ...post, children: [] });
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
      // Parent not in map (filtered out etc.) — treat as root
      roots.push(node);
    }
  });

  const sortByDate = (nodes: ThreadNode[], descending = false): ThreadNode[] =>
    nodes
      .sort((a, b) => {
        const aKey = descending ? (a.commented ?? a.created) : a.created;
        const bKey = descending ? (b.commented ?? b.created) : b.created;
        const diff = new Date(aKey).getTime() - new Date(bKey).getTime();
        return descending ? -diff : diff;
      })
      .map((node) => ({ ...node, children: sortByDate(node.children, false) }));

  return sortByDate(roots, true);
}

export function flattenThread(node: ThreadNode): Post[] {
  return [node, ...node.children.flatMap(flattenThread)];
}

const REACTION_VERBS = new Set(['Like', 'Dislike', 'Announce', 'Accept', 'Reject', 'TentativeAccept', 'Add', 'Remove']);

export function countAllComments(nodes: ThreadNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (!REACTION_VERBS.has(node.verb ?? '')) {
      count += 1 + countAllComments(node.children);
    }
  }
  return count;
}
