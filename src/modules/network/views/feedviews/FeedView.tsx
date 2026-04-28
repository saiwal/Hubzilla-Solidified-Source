// components/views/FeedView.tsx
import { For, Show, createSignal } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import {
  handleLike,
  handleDislike,
  handleRepeat,
  handleComment,
} from "@/modules/network/store/store";
export function FeedPlaceholder() {
  return (
    <div class="animate-pulse bg-surface border border-rim rounded-2xl p-5 mb-4 shadow-sm">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-full bg-accent-muted shrink-0 ring-1 ring-rim" />
        <div class="flex flex-col gap-1.5 pt-1">
          <div class="h-3.5 bg-accent-muted rounded w-32" />
          <div class="h-3 bg-accent-muted rounded w-24" />
        </div>
      </div>
      <div class="mt-4 space-y-2">
        <div class="h-3 bg-accent-muted rounded w-full" />
        <div class="h-3 bg-accent-muted rounded w-5/6" />
        <div class="h-3 bg-accent-muted rounded w-4/6" />
      </div>
      <div class="mt-4 pt-3 border-t border-rim flex items-center gap-5">
        <div class="h-3 bg-accent-muted rounded w-8" />
        <div class="h-3 bg-accent-muted rounded w-8" />
        <div class="h-3 bg-accent-muted rounded w-8" />
      </div>
    </div>
  );
}

function ActionBar(props: { post: ThreadNode }) {
  const p = props.post;
  return (
    <div class="flex items-center gap-1 mt-3">
      <button
        onClick={() => handleLike(p.mid)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-accent-muted
               text-muted hover:text-accent"
        classList={{
          "text-accent bg-accent-muted": p.viewerLiked,
        }}
      >
        <svg
          class="w-3.5 h-3.5"
          fill={p.viewerLiked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
        <Show when={p.likeCount > 0}>
          <span>{p.likeCount}</span>
        </Show>
      </button>

      <button
        onClick={() => handleDislike(p.mid)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-accent-muted
               text-muted hover:text-accent"
        classList={{
          "text-accent bg-accent-muted": p.viewerDisliked,
        }}
      >
        <svg
          class="w-3.5 h-3.5"
          fill={p.viewerDisliked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v12a2 2 0 01-2 2h-2.5a1 1 0 00-1 1v-1.5a1 1 0 00-1-1H9a1 1 0 00-1 1v1.5a1 1 0 001 1H7.5a2 2 0 01-2-2V6a2 2 0 012-2h2.5a1 1 0 001-1V2a1 1 0 011-1h2a1 1 0 011 1v1z"
          />
        </svg>
        <Show when={p.dislikeCount > 0}>
          <span>{p.dislikeCount}</span>
        </Show>
      </button>

      <button
        onClick={() => handleRepeat(p.mid)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-accent-muted
               text-muted hover:text-accent"
        classList={{
          "text-accent bg-accent-muted": p.viewerRepeated,
        }}
      >
        <svg
          class="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <Show when={p.repeatCount > 0}>
          <span>{p.repeatCount}</span>
        </Show>
      </button>
    </div>
  );
}

function CommentBox(props: { post: ThreadNode; onClose: () => void }) {
  const [body, setBody] = createSignal("");
  const submit = () => {
    const text = body().trim();
    if (!text) return;
    handleComment(props.post.mid, text, "Me", "");
    setBody("");
    props.onClose();
  };
  return (
    <div class="mt-3 flex gap-2">
      <textarea
        value={body()}
        onInput={(e) => setBody(e.currentTarget.value)}
        rows={2}
        placeholder="Write a reply…"
        class="flex-1 text-sm rounded-lg border border-rim
               bg-surface px-3 py-2 resize-none text-txt
               focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
      <div class="flex flex-col gap-1">
        <button
          onClick={submit}
          class="px-3 py-1 text-xs font-medium rounded-lg bg-accent text-white hover:opacity-80 transition-opacity"
        >
          Reply
        </button>
        <button
          onClick={props.onClose}
          class="px-3 py-1 text-xs rounded-lg text-muted hover:bg-overlay transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function ThreadedPost(props: { post: ThreadNode; depth?: number }) {
  const [showReply, setShowReply] = createSignal(false);
  const depth = props.depth ?? 0;

  return (
    <div
      classList={{
        "ml-8 border-l-2 border-rim pl-4": depth > 0,
      }}
    >
      <div class="py-3">
        <div class="flex items-start gap-3">
          <Show
            when={props.post.authorAvatar}
            fallback={
              <div class="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-accent-txt shrink-0 flex items-center justify-center text-white text-xs font-bold">
                {props.post.authorName?.[0]?.toUpperCase() ?? "?"}
              </div>
            }
          >
            <img
              src={props.post.authorAvatar}
              alt={props.post.authorName}
              class="w-8 h-8 rounded-full object-cover shrink-0"
            />
          </Show>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <a
                href={props.post.authorUrl}
                class="text-sm font-semibold text-txt hover:underline"
              >
                {props.post.authorName}
              </a>
              <span class="text-xs text-muted">
                {props.post.created?.slice(0, 16)}
              </span>
              <Show when={props.post.verb && props.post.verb !== "Create"}>
                <span class="text-xs text-muted italic">
                  {props.post.verb?.toLowerCase()}
                </span>
              </Show>
            </div>
            <Show when={props.post.title}>
              <p class="text-sm font-medium text-txt mt-0.5">
                {props.post.title}
              </p>
            </Show>
            <div
              class="prose prose-sm dark:prose-invert max-w-none mt-1 text-muted
                        [&>p]:my-1 [&>blockquote]:border-l-2 [&>blockquote]:border-accent [&>blockquote]:pl-3 [&>blockquote]:text-accent
                        [&_img]:max-w-full [&_img]:rounded-lg [&_img]:mt-2"
              innerHTML={props.post.body}
            />
            <ActionBar post={props.post} />
            <Show when={props.post.iid}>
              <button
                onClick={() => setShowReply((v) => !v)}
                class="mt-1 text-xs text-muted hover:text-accent transition-colors"
              >
                Reply
              </button>
            </Show>
            <Show when={showReply()}>
              <CommentBox
                post={props.post}
                onClose={() => setShowReply(false)}
              />
            </Show>
          </div>
        </div>
      </div>
      <Show when={props.post.children.length > 0}>
        <For each={props.post.children}>
          {(child) => <ThreadedPost post={child} depth={depth + 1} />}
        </For>
      </Show>
    </div>
  );
}

export default function FeedView(props: { posts: ThreadNode[] }) {
  return (
    <div class="max-w-2xl mx-auto divide-y divide-rim">
      <For
        each={props.posts}
        fallback={
          <p class="text-center py-16 text-muted text-sm">
            Nothing here yet.
          </p>
        }
      >
        {(post) => (
          <div
            class="bg-surface rounded-xl mb-3 px-4 shadow-sm
                      border border-rim"
          >
            <ThreadedPost post={post} />
          </div>
        )}
      </For>
    </div>
  );
}
