// src/shared/stream/components/ActionBar.tsx
import { Show } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";

export default function ActionBar(props: {
  post: ThreadNode;
  handlers: StreamHandlers;
}) {
  const p = props.post;
  return (
    <div class="flex items-center gap-1 mt-3">
      <button
        onClick={() => props.handlers.onLike(p.mid)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-accent-muted text-muted hover:text-accent"
        classList={{ "text-accent bg-accent-muted": p.viewerLiked }}
      >
        <svg class="w-3.5 h-3.5" fill={p.viewerLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <Show when={p.likeCount > 0}><span>{p.likeCount}</span></Show>
      </button>

      <button
        onClick={() => props.handlers.onDislike(p.mid)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-accent-muted text-muted hover:text-accent"
        classList={{ "text-accent bg-accent-muted": p.viewerDisliked }}
      >
        <svg class="w-3.5 h-3.5" fill={p.viewerDisliked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
        </svg>
        <Show when={p.dislikeCount > 0}><span>{p.dislikeCount}</span></Show>
      </button>

      <button
        onClick={() => props.handlers.onRepeat(p.mid)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-accent-muted text-muted hover:text-accent"
        classList={{ "text-accent bg-accent-muted": p.viewerRepeated }}
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <Show when={p.repeatCount > 0}><span>{p.repeatCount}</span></Show>
      </button>
    </div>
  );
}
