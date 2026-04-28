// src/modules/channel/views/ChannelView.tsx
import { createEffect, onCleanup, Show, For } from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import {
  posts, loading, loadingMore, hasMore, newPosts,
  loadChannel, loadMore, flushNewPosts, stopPolling,
  handleLike, handleDislike, handleRepeat, handleComment,
} from "../store/store";
import PostCard from "@/shared/views/PostCard";
import type { PostActions } from "@/shared/views/PostCard";
import type { ChannelParams } from "../api/api";
import ProfileView from "./ProfileView";

export function PostPlaceholder() {
  return (
    <div class="animate-pulse bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4 shadow-sm">
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700" />
        <div class="flex flex-col gap-1.5 pt-1">
          <div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
          <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
        </div>
      </div>
      <div class="mt-4 space-y-2">
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-full" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-4/6" />
      </div>
      <div class="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-5">
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
      </div>
    </div>
  );
}

const actions: PostActions = {
  onLike:    handleLike,
  onDislike: handleDislike,
  onRepeat:  handleRepeat,
  onComment: handleComment,
};

export default function ChannelView() {
  const params = useParams<{ nick: string }>();
  const [searchParams] = useSearchParams();

  // Re-load whenever nick or search params change (cross-channel navigation)
  createEffect(() => {
    const str = (key: string): string | undefined => {
      const v = searchParams[key];
      return v ? String(Array.isArray(v) ? v[0] : v) : undefined;
    };

    const p: ChannelParams = {
      ...(str("order")  && { order:  str("order") as ChannelParams["order"] }),
      ...(str("search") && { search: str("search") }),
      ...(str("tag")    && { tag:    str("tag") }),
      ...(str("cat")    && { cat:    str("cat") }),
      ...(str("mid")    && { mid:    str("mid") }),
      ...(str("dend")   && { dend:   str("dend") }),
      ...(str("dbegin") && { dbegin: str("dbegin") }),
    };

    loadChannel(params.nick ?? "", p);
  });

  // Stop polling when leaving the route
  onCleanup(() => stopPolling());

  // Infinite scroll sentinel
  let sentinel!: HTMLDivElement;
  createEffect(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      <ProfileView />

      {/* New-posts banner */}
      <Show when={newPosts().length > 0}>
        <button
          onClick={flushNewPosts}
          class="w-full mb-3 py-2 text-sm font-medium rounded-xl
                 bg-accent text-accent-txt border border-accent
                 hover:opacity-90 transition-opacity"
        >
          ↑ {newPosts().length} new {newPosts().length === 1 ? "post" : "posts"}
        </button>
      </Show>

      {/* Loading skeletons */}
      <Show when={loading()}>
        <For each={Array(5).fill(0)}>
          {() => <PostPlaceholder />}
        </For>
      </Show>

      {/* Empty state */}
      <Show when={!loading() && posts().length === 0}>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
          No posts yet.
        </p>
      </Show>

      {/* Posts */}
      <For each={posts()}>
        {(post) => <PostCard post={post} actions={actions} />}
      </For>

      {/* Infinite scroll sentinel + load-more state */}
      <div ref={sentinel} class="h-1" />
      <Show when={loadingMore()}>
        <p class="text-center text-sm text-muted py-4">Loading more…</p>
      </Show>
      <Show when={!hasMore() && posts().length > 0}>
        <p class="text-center text-xs text-muted py-6">You're all caught up.</p>
      </Show>
    </>
  );
}
