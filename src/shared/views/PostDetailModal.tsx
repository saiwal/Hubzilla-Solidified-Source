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
interface PostDetailModalProps {
  uuid: string;
  onClose: () => void;
  handlers?: StreamHandlers;
}

const PostDetailModal: Component<PostDetailModalProps> = (props) => {
  const [node, { refetch }] = createResource(() => props.uuid, fetchDisplay);
  const [nestedUuid, setNestedUuid] = createSignal<string | null>(null);

  let dialogRef!: HTMLDivElement;
  onMount(() => dialogRef?.focus());

  // If the UUID we were given belongs to a comment (not the root post), highlight it
  const highlightUuid = createMemo(() => {
    const n = node();
    if (!n) return undefined;
    return props.uuid !== n.uuid ? props.uuid : undefined;
  });

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

  // Wrap handlers to trigger a refetch after each mutation so counts update
  const wrappedHandlers: StreamHandlers | undefined = props.handlers
    ? {
        onLike: (mid: string) => {
          props.handlers!.onLike(mid);
          refetch();
        },
        onDislike: (mid: string) => {
          props.handlers!.onDislike(mid);
          refetch();
        },
        onRepeat: (mid: string) => {
          props.handlers!.onRepeat(mid);
          refetch();
        },
        onComment: (
          parentMid: string,
          body: string,
          authorName: string,
          authorAvatar: string,
        ) => {
          props.handlers!.onComment(parentMid, body, authorName, authorAvatar);
          refetch();
        },
        onLoadComments: (mid: string, uuid: string) =>
          props.handlers!.onLoadComments(mid, uuid),
        onStar: props.handlers!.onStar
          ? (mid: string) => props.handlers!.onStar!(mid)
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
              Post
            </h2>
            <button
              onClick={props.onClose}
              class="p-1.5 rounded-lg hover:bg-elevated
                     text-subtle hover:text-txt transition-colors"
              aria-label="Close"
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
                  Failed to load post: {node.error?.message}
                </p>
              </div>
            </Show>

            <Show when={node()}>
              {(n) => (
                <PostCard
                  post={n()}
                  highlightUuid={highlightUuid()}
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
