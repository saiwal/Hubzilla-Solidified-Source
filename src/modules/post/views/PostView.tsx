// src/modules/post/views/PostView.tsx
import { createMemo, createResource, createSignal, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import PostCard from "@/shared/stream/components/PostCard";
import type { StreamHandlers } from "@/shared/stream/types";
import type { ThreadNode } from "@/shared/lib/thread";
import { buildThreadTree } from "@/shared/lib/thread";
import type { Post } from "@/shared/types/post.types";
import { mapActivityToPost } from "@/shared/lib/activity.mapper";
import { useI18n } from "@/i18n";
import {
  apiDeleteItem,
  apiToggleStar,
  apiCreateComment,
} from "@/shared/lib/item-api";
import { toggleVerb, repeatItem } from "@/shared/stream/store/actions-store";

async function fetchPost(uuid: string): Promise<ThreadNode> {
  const res = await fetch(`/api/display/${uuid}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const data = json.data ?? json;
  if (data.error) throw new Error(data.error);
  const all: Post[] = [data.post, ...data.comments].map(mapActivityToPost);
  const tree = buildThreadTree(all);
  return tree[0];
}

type ReactionOverride = {
  viewerLiked?: boolean;
  viewerDisliked?: boolean;
  viewerRepeated?: boolean;
  viewerStarred?: boolean;
  likeCount?: number;
  dislikeCount?: number;
  repeatCount?: number;
};

function findInTree(n: ThreadNode | undefined, mid: string): ThreadNode | undefined {
  if (!n) return undefined;
  if (n.mid === mid) return n;
  for (const child of n.children) {
    const found = findInTree(child, mid);
    if (found) return found;
  }
  return undefined;
}

function applyOverrides(n: ThreadNode, overrides: Record<string, ReactionOverride>): ThreadNode {
  const o = overrides[n.mid];
  return {
    ...(o ? { ...n, ...o } : n),
    children: n.children.map(c => applyOverrides(c, overrides)),
  };
}

export default function PostView() {
  const params = useParams<{ uuid: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [node, { refetch }] = createResource(() => params.uuid, fetchPost);
  const [localReactions, setLocalReactions] = createSignal<Record<string, ReactionOverride>>({});

  const displayNode = createMemo((): ThreadNode | undefined => {
    const n = node();
    return n ? applyOverrides(n, localReactions()) : undefined;
  });

  function toggleReaction(
    mid: string,
    viewerField: keyof Pick<ReactionOverride, "viewerLiked" | "viewerDisliked" | "viewerRepeated">,
    countField: keyof Pick<ReactionOverride, "likeCount" | "dislikeCount" | "repeatCount">,
  ) {
    setLocalReactions(prev => {
      const o = prev[mid] ?? {};
      const treeNode = findInTree(node(), mid);
      const currentActive = o[viewerField] ?? treeNode?.[viewerField] ?? false;
      const currentCount = o[countField] ?? treeNode?.[countField] ?? 0;
      return {
        ...prev,
        [mid]: {
          ...o,
          [viewerField]: !currentActive,
          [countField]: currentActive ? currentCount - 1 : currentCount + 1,
        },
      };
    });
  }

  const handlers: StreamHandlers = {
    onLike(mid) {
      const found = findInTree(node(), mid);
      if (!found?.iid) return;
      toggleReaction(mid, "viewerLiked", "likeCount");
      toggleVerb(found.iid, "like").catch(() => toggleReaction(mid, "viewerLiked", "likeCount"));
    },
    onDislike(mid) {
      const found = findInTree(node(), mid);
      if (!found?.iid) return;
      toggleReaction(mid, "viewerDisliked", "dislikeCount");
      toggleVerb(found.iid, "dislike").catch(() => toggleReaction(mid, "viewerDisliked", "dislikeCount"));
    },
    onRepeat(mid) {
      const o = localReactions()[mid];
      const treeNode = findInTree(node(), mid);
      const alreadyRepeated = o?.viewerRepeated ?? treeNode?.viewerRepeated ?? false;
      if (alreadyRepeated || !treeNode?.iid) return;
      setLocalReactions(prev => {
        const existing = prev[mid] ?? {};
        return { ...prev, [mid]: { ...existing, viewerRepeated: true, repeatCount: (existing.repeatCount ?? treeNode.repeatCount ?? 0) + 1 } };
      });
      repeatItem(treeNode.iid).catch(() => {
        setLocalReactions(prev => {
          const existing = prev[mid] ?? {};
          return { ...prev, [mid]: { ...existing, viewerRepeated: false, repeatCount: (existing.repeatCount ?? 1) - 1 } };
        });
      });
    },
    async onComment(parentMid, body) {
      const found = findInTree(node(), parentMid);
      if (!found) return;
      await apiCreateComment(found.uuid, body);
      refetch();
    },
    onLoadComments: () => Promise.resolve(),
    onStar(mid) {
      const found = findInTree(node(), mid);
      if (!found?.iid) return;
      const o = localReactions()[mid];
      const current = o?.viewerStarred ?? found.viewerStarred ?? false;
      setLocalReactions(prev => ({ ...prev, [mid]: { ...(prev[mid] ?? {}), viewerStarred: !current } }));
      apiToggleStar(found.iid).catch(() => {
        setLocalReactions(prev => ({ ...prev, [mid]: { ...(prev[mid] ?? {}), viewerStarred: current } }));
      });
    },
    async onDelete(mid) {
      const found = findInTree(node(), mid);
      if (found?.uuid) await apiDeleteItem(found.uuid);
      navigate(-1);
    },
  };

  return (
    <div class="max-w-2xl mx-auto py-4 px-2">
      <Show when={node.loading && !node()}>
        <div class="space-y-4 animate-pulse">
          <div class="bg-surface rounded-2xl p-5">
            <div class="flex gap-3 mb-4">
              <div class="w-11 h-11 rounded-full bg-elevated" />
              <div class="flex-1 space-y-2 pt-1">
                <div class="h-3 bg-elevated rounded w-1/3" />
                <div class="h-3 bg-elevated rounded w-1/4" />
              </div>
            </div>
            <div class="space-y-2">
              <div class="h-3 bg-elevated rounded" />
              <div class="h-3 bg-elevated rounded w-5/6" />
              <div class="h-3 bg-elevated rounded w-4/6" />
            </div>
          </div>
        </div>
      </Show>

      <Show when={node.error}>
        <div class="bg-surface rounded-2xl p-6 text-center">
          <p class="text-sm text-red-500">
            {t("post.load_error")}: {node.error?.message}
          </p>
        </div>
      </Show>

      <Show when={displayNode()}>
        {(n) => (
          <PostCard
            post={n()}
            initiallyExpanded
            handlers={handlers}
          />
        )}
      </Show>
    </div>
  );
}
