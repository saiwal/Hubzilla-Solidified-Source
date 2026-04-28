// src/shared/stream/feedviews/FeedView.tsx
import { For, Show, createSignal } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import ActionBar from "../components/ActionBar";
import CommentBox from "../components/CommentBox";

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

function ThreadedPost(props: { post: ThreadNode; handlers: StreamHandlers; depth?: number }) {
  const [showReply, setShowReply] = createSignal(false);
  const depth = props.depth ?? 0;

  return (
    <div classList={{ "ml-8 border-l-2 border-rim pl-4": depth > 0 }}>
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
            <img src={props.post.authorAvatar} alt={props.post.authorName}
              class="w-8 h-8 rounded-full object-cover shrink-0" />
          </Show>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <a href={props.post.authorUrl} class="text-sm font-semibold text-txt hover:underline">
                {props.post.authorName}
              </a>
              <span class="text-xs text-muted">{props.post.created?.slice(0, 16)}</span>
              <Show when={props.post.verb && props.post.verb !== "Create"}>
                <span class="text-xs text-muted italic">{props.post.verb?.toLowerCase()}</span>
              </Show>
            </div>
            <Show when={props.post.title}>
              <p class="text-sm font-medium text-txt mt-0.5">{props.post.title}</p>
            </Show>
            <div
              class="prose prose-sm dark:prose-invert max-w-none mt-1 text-muted
                     [&>p]:my-1 [&>blockquote]:border-l-2 [&>blockquote]:border-accent
                     [&>blockquote]:pl-3 [&>blockquote]:text-accent
                     [&_img]:max-w-full [&_img]:rounded-lg [&_img]:mt-2"
              innerHTML={props.post.body}
            />
            <ActionBar post={props.post} handlers={props.handlers} />
            <Show when={props.post.iid}>
              <button onClick={() => setShowReply((v) => !v)}
                class="mt-1 text-xs text-muted hover:text-accent transition-colors">
                Reply
              </button>
            </Show>
            <Show when={showReply()}>
              <CommentBox post={props.post} handlers={props.handlers} onClose={() => setShowReply(false)} />
            </Show>
          </div>
        </div>
      </div>
      <Show when={props.post.children.length > 0}>
        <For each={props.post.children}>
          {(child) => <ThreadedPost post={child} handlers={props.handlers} depth={depth + 1} />}
        </For>
      </Show>
    </div>
  );
}

export default function FeedView(props: { posts: ThreadNode[]; handlers: StreamHandlers }) {
  return (
    <div class="max-w-2xl mx-auto divide-y divide-rim">
      <For
        each={props.posts}
        fallback={<p class="text-center py-16 text-muted text-sm">Nothing here yet.</p>}
      >
        {(post) => (
          <div class="bg-surface rounded-xl mb-3 px-4 shadow-sm border border-rim">
            <ThreadedPost post={post} handlers={props.handlers} />
          </div>
        )}
      </For>
    </div>
  );
}
