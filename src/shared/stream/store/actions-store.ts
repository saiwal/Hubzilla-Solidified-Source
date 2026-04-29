export async function toggleVerb(
  iid: number,
  verb: "like" | "dislike" | "announce",
): Promise<void> {
  const url = `/like/${iid}?verb=${verb}&conv_mode=&page_mode=client&reload=0`;
  const res = await fetch(url, { method: "GET", credentials: "include" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${verb} failed: ${res.status} ${text}`);
  }
}
function iidFor(mid: string): number {
  const node = findNode(store.posts(), mid);
  return node ? Number(node.id) : 0;
}
// ── reactions ─────────────────────────────────────────────────────────────────
export function handleLike(mid: string) {
  const iid = iidFor(mid);
  store.optimisticToggle(mid, "like", "likeCount", () =>
    toggleVerb(iid, "like"),
  );
}

export function handleDislike(mid: string) {
  const iid = iidFor(mid);
  store.optimisticToggle(mid, "dislike", "dislikeCount", () =>
    toggleVerb(iid, "dislike"),
  );
}

export function handleRepeat(mid: string) {
  const iid = iidFor(mid);
  store.optimisticToggle(mid, "announce", "repeatCount", () =>
    toggleVerb(iid, "announce"),
  );
}
