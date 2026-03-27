import { onMount, onCleanup, Show, For } from "solid-js";
import { posts, loadNetwork, loading, loadMore, loadingMore, hasMore, newPosts, flushNewPosts } from "./store";
import StreamList from "../include/feedviews/StreamList";
import StreamFilters from "./StreamFilters";
import type { ViewMode } from './store';
import { setViewMode } from './store';
import ViewSwitcher from "../include/ViewSwitcher";

export function PostPlaceholder() {
  return (
    <div class="animate-pulse bg-white dark:bg-gray-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4 shadow-sm">
      {/* Header */}
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700" />
        <div class="flex flex-col gap-1.5 pt-1">
          <div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
          <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
        </div>
      </div>

      {/* Body */}
      <div class="mt-4 space-y-2">
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-full" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-4/6" />
      </div>

      {/* Footer */}
      <div class="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-5">
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
      </div>
    </div>
  );
}

export default function Network() {
  let sentinelRef!: HTMLDivElement;

  onMount(() => {
      // StreamFilters calls loadNetwork on mount via its own apply(),
    // but we still need an initial load with defaults if filters haven't fired yet
    loadNetwork({ order: "created" });
		const view = 'feed';
		if (view) setViewMode(view as ViewMode);
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef);
    onCleanup(() => observer.disconnect()); 
	});

  return (
    <div class="relative">
      <StreamFilters />
			<ViewSwitcher />
      {/* New posts banner */}
      <Show when={newPosts().length > 0}>
        <div class="sticky top-2 z-10 flex justify-center">
          <button
            onClick={flushNewPosts}
            class="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors"
          >
            ↑ {newPosts().length} new {newPosts().length === 1 ? 'post' : 'posts'}
          </button>
        </div>
      </Show>

      <Show when={loading()}>
				<For each={Array(5).fill(0)}>
          {() => <PostPlaceholder />}
        </For>
      </Show>

      <StreamList posts={posts()} />

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} class="h-4" />

      <Show when={loadingMore()}>
        <p class="text-center py-4 text-sm text-gray-500">Loading more…</p>
      </Show>

      <Show when={!hasMore() && posts().length > 0}>
        <p class="text-center py-4 text-sm text-gray-400">You're all caught up</p>
      </Show>
    </div>
  );
}
