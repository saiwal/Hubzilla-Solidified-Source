// src/shared/stream/store/actions-store.ts
//
// Single source of truth for all post-level actions.
// Every stream module (network, channel, articles) imports from here.
// To add a new action, add it to createActionHandlers and to StreamHandlers.
//
// Actions defined here:
//   handleLike · handleDislike · handleRepeat · handleStar · handleDelete
//   handleComment · loadComments
//
// Planned (not yet implemented):
//   handleFileInFolder — requires Hubzilla folder/collection API integration

import type { ThreadNode } from "@/shared/lib/thread";
import { buildThreadTree } from "@/shared/lib/thread";
import type { createStreamStore } from "./createStreamStore";
import { updateNode } from "./createStreamStore";
import { fetchComments, fetchItemDetail, apiDeleteItem, apiToggleStar, postComment } from "@/shared/lib/item-api";
import { mapActivityToPost } from "@/shared/lib/activity.mapper";

type StreamStore = ReturnType<typeof createStreamStore>;

export const REACTION_VERBS = new Set([
  "Like", "Dislike", "Announce", "Accept", "Reject",
  "TentativeAccept", "Add", "Remove",
]);

// ── low-level API calls ───────────────────────────────────────────────────────

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

// ── node lookup ───────────────────────────────────────────────────────────────

export function findNode(nodes: ThreadNode[], mid: string): ThreadNode | undefined {
  for (const n of nodes) {
    if (n.mid === mid || n.uuid === mid) return n;
    if (n.children.length) {
      const found = findNode(n.children, mid);
      if (found) return found;
    }
  }
  return undefined;
}

// ── action handler factory ────────────────────────────────────────────────────

export function createActionHandlers(store: StreamStore) {
  function iidFor(mid: string): number {
    const node = findNode(store.posts(), mid);
    return node ? Number(node.id) : 0;
  }

  return {
    handleLike(mid: string) {
      const iid = iidFor(mid);
      store.optimisticToggle(mid, "like", "likeCount", () => toggleVerb(iid, "like"));
    },

    handleDislike(mid: string) {
      const iid = iidFor(mid);
      store.optimisticToggle(mid, "dislike", "dislikeCount", () => toggleVerb(iid, "dislike"));
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

    handleStar(mid: string) {
      const node = findNode(store.posts(), mid);
      if (!node?.iid) return;
      const newStarred = !(node.viewerStarred ?? false);
      store.setPosts((prev) =>
        updateNode(prev, mid, (n) => ({ ...n, viewerStarred: newStarred })),
      );
      apiToggleStar(node.iid).catch(() => {
        store.setPosts((prev) =>
          updateNode(prev, mid, (n) => ({ ...n, viewerStarred: !newStarred })),
        );
      });
      // TODO: handleFileInFolder — add folder assignment here once Hubzilla
      // collection/folder API (/api/item/:id/file or equivalent) is integrated
    },

    async handleDelete(mid: string): Promise<void> {
      const node = findNode(store.posts(), mid);
      if (!node) return;
      await apiDeleteItem(node.uuid);
      store.setPosts((prev) => prev.filter((p) => p.mid !== mid));
    },

    async handleComment(
      parentMid: string,
      body: string,
      authorName: string,
      authorAvatar: string,
    ): Promise<void> {
      const parentIid = iidFor(parentMid);
      const tempMid = crypto.randomUUID();

      const tempComment: ThreadNode = {
        uuid: tempMid, id: tempMid, mid: tempMid,
        parent_mid: parentMid, thr_parent: parentMid,
        top_mid: parentMid, parent: parentMid,
        body, title: "", authorName, authorAvatar, authorUrl: "",
        created: new Date().toISOString().replace("T", " ").slice(0, 19),
        verb: "Create", obj_type: "Note", flags: [], permalink: "",
        likeCount: 0, dislikeCount: 0, repeatCount: 0,
        viewerLiked: false, viewerDisliked: false, viewerRepeated: false,
        item_thread_top: 0, children: [],
      };

      store.setPosts((prev) =>
        updateNode(prev, parentMid, (n) => ({
          ...n, children: [...n.children, tempComment],
        })),
      );

      postComment({
        body,
        parent_iid: parentIid,
        profile_uid: store.profileUid(),
      }).catch(() => {
        store.setPosts((prev) =>
          updateNode(prev, parentMid, (n) => ({
            ...n, children: n.children.filter((c) => c.mid !== tempMid),
          })),
        );
      });
    },

    async loadComments(mid: string, uuid: string): Promise<void> {
      const result = await fetchComments(uuid);
      const comments = (result.comments ?? []).filter(
        (a: any) => !REACTION_VERBS.has(a.verb),
      );
      const nodes = buildThreadTree(comments.map(mapActivityToPost));
      store.setNodeChildren(mid, nodes);
    },

    async handleRefresh(mid: string, uuid: string): Promise<void> {
      const detail = await fetchItemDetail(uuid);
      const item = detail?.item;
      if (item) {
        store.setPosts((prev) =>
          updateNode(prev, mid, (n) => ({
            ...n,
            likeCount:       item.like_count      ?? n.likeCount,
            dislikeCount:    item.dislike_count   ?? n.dislikeCount,
            repeatCount:     item.announce_count  ?? n.repeatCount,
            commentCount:    item.comment_count   ?? n.commentCount,
            viewerLiked:     item.viewer_liked    ?? n.viewerLiked,
            viewerDisliked:  item.viewer_disliked ?? n.viewerDisliked,
            viewerRepeated:  item.viewer_repeated ?? n.viewerRepeated,
          })),
        );
      }
      // Reload comments only if they were already fetched
      const node = findNode(store.posts(), mid);
      if (node && node.children.length > 0) {
        const result = await fetchComments(uuid);
        const comments = (result.comments ?? []).filter(
          (a: any) => !REACTION_VERBS.has(a.verb),
        );
        store.setNodeChildren(mid, buildThreadTree(comments.map(mapActivityToPost)));
      }
    },
  };
}
