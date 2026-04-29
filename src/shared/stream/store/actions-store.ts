// src/shared/stream/store/actions-store.ts
import type { ThreadNode } from "@/shared/lib/thread";
import type { createStreamStore } from "./createStreamStore";
import { updateNode } from "./createStreamStore";
type StreamStore = ReturnType<typeof createStreamStore>;

export async function toggleVerb(
  iid: number,
  verb: "like" | "dislike" | "announce" | "star",
): Promise<void> {
  const url = `/like/${iid}?verb=${verb}&conv_mode=&page_mode=client&reload=0`;
  const res = await fetch(url, { method: "GET", credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${verb} failed: ${res.status} ${text}`);
  }
}
export async function repeatItem(iid: number): Promise<void> {
  const url = `/share/${iid}`;
  const res = await fetch(url, { method: "GET", credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`repeat failed: ${res.status} ${text}`);
  }
}
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

export function createActionHandlers(store: StreamStore) {
  function iidFor(mid: string): number {
    const node = findNode(store.posts(), mid);
    return node ? Number(node.id) : 0;
  }

  return {
    handleLike(mid: string) {
      const iid = iidFor(mid);
      store.optimisticToggle(mid, "like", "likeCount", () =>
        toggleVerb(iid, "like"),
      );
    },
    handleDislike(mid: string) {
      const iid = iidFor(mid);
      store.optimisticToggle(mid, "dislike", "dislikeCount", () =>
        toggleVerb(iid, "dislike"),
      );
    },
    handleRepeat(mid: string) {
      const iid = iidFor(mid);
      const node = findNode(store.posts(), mid);
      if (!node || node.viewerRepeated) return;
      store.setPosts((prev) =>
        updateNode(prev, mid, (n) => ({
          ...n,
          viewerRepeated: true,
          repeatCount: n.repeatCount + 1,
        })),
      );
      repeatItem(iid).catch(() => {
        store.setPosts((prev) =>
          updateNode(prev, mid, (n) => ({
            ...n,
            viewerRepeated: false,
            repeatCount: n.repeatCount - 1,
          })),
        );
      });
    },
  };
}
