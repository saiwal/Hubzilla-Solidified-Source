// src/modules/pubstream/store.ts
import { createSignal, batch } from "solid-js";
import { fetchPubstream, type PubstreamMeta } from "./api";
import type { Post } from "@/shared/types/post.types";
import { buildThreadTree } from "@/shared/lib/thread";
import type { ThreadNode } from "@/shared/lib/thread";
import { bbcodeToHtml } from "@/shared/lib/bbcode";
import { sanitizeHtml } from "@/shared/lib/sanitize";

// ── Constants ──────────────────────────────────────────────────────────────
const PAGE_LIMIT = 20;
const MAX_POSTS  = 200;

// ── Module-level singleton state ───────────────────────────────────────────
const [posts,    setPosts]    = createSignal<Post[]>([]);
const [threads,  setThreads]  = createSignal<ThreadNode[]>([]);
const [loading,  setLoading]  = createSignal(false);
const [hasMore,  setHasMore]  = createSignal(true);
const [page,     setPage]     = createSignal(1);
const [error,    setError]    = createSignal<string | null>(null);
const [disabled, setDisabled] = createSignal(false);
const [meta,     setMeta]     = createSignal<PubstreamMeta | null>(null);

export {
  threads, loading, hasMore, page, error, disabled, meta, posts,
};

// ── Helpers ────────────────────────────────────────────────────────────────
function processBody(raw: string): string {
  return sanitizeHtml(bbcodeToHtml(raw));
}

function rebuildThreads(allPosts: Post[]): void {
  const processed = allPosts.map((p) => ({ ...p, body: processBody(p.body) }));
  setThreads(buildThreadTree(processed));
}

// ── Actions ────────────────────────────────────────────────────────────────

/** Initial load (or refresh). Resets all state. */
export async function loadPubstream(tag?: string, net?: string): Promise<void> {
  if (loading()) return;
  setLoading(true);
  setError(null);

  try {
    const data = await fetchPubstream({ page: 1, limit: PAGE_LIMIT, tag, net });

    if (data === null) {
      batch(() => {
        setDisabled(true);
        setLoading(false);
        setPosts([]);
        setThreads([]);
      });
      return;
    }

    batch(() => {
      setDisabled(false);
      setMeta(data.meta);
      setPage(1);
      setHasMore(data.has_more);
      setPosts(data.posts.slice(0, MAX_POSTS));
      rebuildThreads(data.posts.slice(0, MAX_POSTS));
      setLoading(false);
    });
  } catch (e) {
    batch(() => {
      setError(e instanceof Error ? e.message : "Failed to load public stream");
      setLoading(false);
    });
  }
}

/** Load the next page and append. */
export async function loadMore(tag?: string, net?: string): Promise<void> {
  if (loading() || !hasMore()) return;
  const nextPage = page() + 1;
  setLoading(true);

  try {
    const data = await fetchPubstream({ page: nextPage, limit: PAGE_LIMIT, tag, net });
    if (!data) { setLoading(false); return; }

    batch(() => {
      setPage(nextPage);
      setHasMore(data.has_more);
      const combined = [...posts(), ...data.posts].slice(-MAX_POSTS);
      setPosts(combined);
      rebuildThreads(combined);
      setLoading(false);
    });
  } catch (e) {
    batch(() => {
      setError(e instanceof Error ? e.message : "Failed to load more");
      setLoading(false);
    });
  }
}

/** Optimistically update like count. */
export function optimisticLike(mid: string): void {
  setPosts((prev) =>
    prev.map((p) => {
      if (p.mid !== mid) return p;
      const liked = !p.viewerLiked;
      return {
        ...p,
        viewerLiked: liked,
        likeCount: p.likeCount + (liked ? 1 : -1),
      };
    }),
  );
  rebuildThreads(posts());
}

/** Optimistically update repeat count. */
export function optimisticRepeat(mid: string): void {
  setPosts((prev) =>
    prev.map((p) => {
      if (p.mid !== mid) return p;
      const repeated = !p.viewerRepeated;
      return {
        ...p,
        viewerRepeated: repeated,
        repeatCount: p.repeatCount + (repeated ? 1 : -1),
      };
    }),
  );
  rebuildThreads(posts());
}
