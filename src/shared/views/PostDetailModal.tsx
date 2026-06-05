// src/shared/views/PostDetailModal.tsx
import { type Component, createMemo, createResource, createSignal, Show, onMount } from "solid-js";
import { Portal } from "solid-js/web";
import PostCard from "../stream/components/PostCard";
import type { StreamHandlers } from "../stream/types";
import type { ThreadNode } from "../lib/thread";
import { buildThreadTree } from "../lib/thread";
import type { Post } from "../types/post.types";
import { mapActivityToPost } from "../lib/activity.mapper";
import { BiRegularX } from "solid-icons/bi";
import { useI18n } from "@/i18n";

async function fetchDisplay(uuid: string): Promise<ThreadNode> {
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

interface PostDetailModalProps {
  uuid: string;
  onClose: () => void;
  handlers?: StreamHandlers;
}

const PostDetailModal: Component<PostDetailModalProps> = (props) => {
  const [node, { refetch }] = createResource(() => props.uuid, fetchDisplay);
  const [nestedUuid, setNestedUuid] = createSignal<string | null>(null);
  const [localReactions, setLocalReactions] = createSignal<Record<string, ReactionOverride>>({});

  const { t } = useI18n();
  let dialogRef!: HTMLDivElement;
  onMount(() => dialogRef?.focus());

  const highlightUuid = createMemo(() => {
    const n = node();
    if (!n) return undefined;
    return props.uuid !== n.uuid ? props.uuid : undefined;
  });

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

  function handleBodyClick(e: MouseEvent) {
    const anchor = (e.target as HTMLElement).closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    try {
      let path: string;
      if (href.startsWith("http")) {
        const url = new URL(href);
        if (url.hostname !== window.location.hostname) return;
        path = url.pathname;
      } else {
        path = href;
      }
      const m = path.match(/\/display\/([^/?#]+)/);
      if (m) {
        e.preventDefault();
        setNestedUuid(m[1]);
      }
    } catch { /* ignore */ }
  }

  const wrappedHandlers: StreamHandlers | undefined = props.handlers
    ? {
        onLike: (mid: string) => {
          props.handlers!.onLike(mid);
          toggleReaction(mid, "viewerLiked", "likeCount");
        },
        onDislike: (mid: string) => {
          props.handlers!.onDislike(mid);
          toggleReaction(mid, "viewerDisliked", "dislikeCount");
        },
        onRepeat: (mid: string) => {
          const o = localReactions()[mid];
          const treeNode = findInTree(node(), mid);
          const alreadyRepeated = o?.viewerRepeated ?? treeNode?.viewerRepeated ?? false;
          if (alreadyRepeated) return;
          props.handlers!.onRepeat(mid);
          setLocalReactions(prev => {
            const existing = prev[mid] ?? {};
            const currentCount = existing.repeatCount ?? treeNode?.repeatCount ?? 0;
            return { ...prev, [mid]: { ...existing, viewerRepeated: true, repeatCount: currentCount + 1 } };
          });
        },
        onComment: (parentMid, body, authorName, authorAvatar) => {
          props.handlers!.onComment(parentMid, body, authorName, authorAvatar);
          refetch();
        },
        onLoadComments: (mid, uuid) => props.handlers!.onLoadComments(mid, uuid),
        onStar: props.handlers!.onStar
          ? (mid: string) => {
              props.handlers!.onStar!(mid);
              setLocalReactions(prev => {
                const o = prev[mid] ?? {};
                const treeNode = findInTree(node(), mid);
                const current = o.viewerStarred ?? treeNode?.viewerStarred ?? false;
                return { ...prev, [mid]: { ...o, viewerStarred: !current } };
              });
            }
          : undefined,
        onDelete: props.handlers!.onDelete
          ? async (mid: string) => { await props.handlers!.onDelete!(mid); props.onClose(); }
          : undefined,
        onRefresh: async () => { refetch(); },
      }
    : undefined;

  return (
    <Portal>
      <Show when={nestedUuid()}>
        <PostDetailModal
          uuid={nestedUuid()!}
          onClose={() => setNestedUuid(null)}
          handlers={props.handlers}
        />
      </Show>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay/80"
        onClick={(e) => {
          if (e.target === e.currentTarget) props.onClose();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="post-modal-title"
          tabindex="-1"
          class="relative w-full max-w-full lg:max-w-[50%] max-h-[90svh] flex flex-col
                 bg-base rounded-2xl shadow-2xl overflow-hidden focus:outline-none"
        >
          {/* Header */}
          <div class="flex items-center justify-between px-5 py-3 shrink-0 border-b border-rim bg-surface">
            <h2 id="post-modal-title" class="text-sm font-semibold text-muted">
              {t("post.modal_title")}
            </h2>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-lg hover:bg-elevated
                     text-subtle hover:text-txt transition-colors"
              aria-label={t("post.modal_close")}
            >
              <BiRegularX />
            </button>
          </div>

          {/* Scrollable body */}
          <div
            class="flex-1 overflow-y-auto p-4"
            style={{ "-webkit-overflow-scrolling": "touch" }}
            onClick={(e) => { e.stopPropagation(); handleBodyClick(e); }}
          >
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
                  highlightUuid={highlightUuid()}
                  initiallyExpanded
                  handlers={
                    wrappedHandlers ?? {
                      onLike: () => {},
                      onDislike: () => {},
                      onRepeat: () => {},
                      onComment: () => {},
                      onLoadComments: () => Promise.resolve(),
                    }
                  }
                />
              )}
            </Show>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default PostDetailModal;
