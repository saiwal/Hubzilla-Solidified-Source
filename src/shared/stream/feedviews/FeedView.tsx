// src/shared/stream/feedviews/FeedView.tsx
import { For } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import PostCard from "../components/PostCard";

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
// src/shared/stream/feedviews/FeedView.tsx

export default function FeedView(props: { posts: ThreadNode[]; handlers: StreamHandlers }) {
  return (
    <div class="max-w-2xl mx-auto">
      <For
        each={props.posts}
        fallback={<p class="text-center py-16 text-muted text-sm">Nothing here yet.</p>}
      >
        {(post) => <PostCard post={post} handlers={props.handlers} />}
      </For>
    </div>
  );
}
