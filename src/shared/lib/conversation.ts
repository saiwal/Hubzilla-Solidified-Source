// lib/buildThreads.ts
import type { RawItem, ThreadedPost } from "../types/stream.type";

/**
 * Mirrors the threaded-view branch of conversation() + ThreadStream/ThreadItem.
 *
 * PHP flow:
 *   items_by_parent_ids()  → flat array, roots + children interleaved
 *   conv_sort()            → roots sorted by ordering field
 *   ThreadStream.add_thread() + ThreadItem → groups children under root
 *
 * We do the same in three passes:
 *   1. Index every item by id
 *   2. Bucket children under their parent
 *   3. Sort root buckets by the active ordering field
 */
export function buildThreads(
  items: RawItem[],
  ordering: "created" | "commented" = "commented"
): ThreadedPost[] {
  // Pass 1 — index
  const byId = new Map<number, RawItem>();
  for (const item of items) {
    byId.set(item.id, item);
  }

  // Pass 2 — bucket
  const roots: RawItem[] = [];
  const childrenOf = new Map<number, RawItem[]>();

  for (const item of items) {
    if (item.id === item.parent) {
      roots.push(item);
    } else {
      if (!childrenOf.has(item.parent)) {
        childrenOf.set(item.parent, []);
      }
      childrenOf.get(item.parent)!.push(item);
    }
  }

  // Sort children within each thread oldest-first (matches PHP conv_sort inner order)
  for (const [, children] of childrenOf) {
    children.sort(
      (a, b) =>
        new Date(a.created).getTime() - new Date(b.created).getTime()
    );
  }

  // Pass 3 — sort roots by active ordering field, newest first
  roots.sort((a, b) => {
    const field = ordering === "commented" ? "commented" : "created";
    return new Date(b[field] as string).getTime() - new Date(a[field] as string).getTime();
  });

  // Build output
  return roots.map((root) => {
    const children = childrenOf.get(root.id) ?? [];
    return {
      item: root,
      children,
      flat: [root, ...children],
    };
  });
}

/**
 * For nouveau / unthreaded mode — PHP just loops items in created DESC order.
 * No grouping, no deduplication.
 */
export function buildUnthreaded(items: RawItem[]): ThreadedPost[] {
  return items.map((item) => ({
    item,
    children: [],
    flat: [item],
  }));
}

/**
 * Top-level entry point. Mirrors the mode dispatch in conversation().
 */
export function assembleStream(
  items: RawItem[],
  nouveau: boolean,
  ordering: "created" | "commented" = "commented"
): ThreadedPost[] {
  if (nouveau) return buildUnthreaded(items);
  return buildThreads(items, ordering);
}
