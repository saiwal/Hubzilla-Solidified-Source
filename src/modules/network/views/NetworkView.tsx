// src/modules/network/views/NetworkView.tsx
import { createEffect, Show, For, Switch, Match } from "solid-js";
import { useAuth } from "@/shared/store/auth-store";
import StreamList from "@/shared/stream/feedviews/StreamList";
import type { StreamHandlers } from "@/shared/stream/types";
import { ListPlaceholder } from "@/shared/stream/feedviews/ListView";
import { MasonryPlaceholder } from "@/shared/stream/feedviews/MasonryView";
import { FeedPlaceholder } from "@/shared/stream/feedviews/FeedView";
import StreamFilters from "./StreamFilters";
import {
  viewMode, posts, loadNetwork, resetPosts,
  loading, loadMore, loadingMore, hasMore, newPosts, flushNewPosts,
  handleLike, handleDislike, handleRepeat, handleComment, loadComments,
} from "../store";
const handlers: StreamHandlers = {
  onLike:           handleLike,
  onDislike:        handleDislike,
  onRepeat:         handleRepeat,
  onComment:        handleComment,
  onLoadComments:   loadComments,
};

export default function NetworkView() {
  const auth = useAuth();
  let initialized = false;

  createEffect(() => {
    if (auth.loading) return;
    if (initialized) return;
    initialized = true;
    resetPosts();
    loadNetwork({ order: "created" });
  });

  return (
    <div class="relative">
      <StreamFilters />

      <Show when={newPosts().length > 0}>
        <div class="sticky top-2 z-10 flex justify-center">
          <button
            onClick={flushNewPosts}
            class="px-4 py-2 rounded-full bg-accent text-white text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            ↑ {newPosts().length} new {newPosts().length === 1 ? "post" : "posts"}
          </button>
        </div>
      </Show>

      <Show
        when={!loading()}
        fallback={
          <Switch>
            <Match when={viewMode() === "list" || viewMode() === "inbox"}>
              <ListPlaceholder count={8} />
            </Match>
            <Match when={viewMode() === "masonry"}>
              <MasonryPlaceholder count={12} />
            </Match>
            <Match when={true}>
              <For each={Array(5).fill(0)}>{() => <FeedPlaceholder />}</For>
            </Match>
          </Switch>
        }
      >
        <StreamList posts={posts()} viewMode={viewMode()} handlers={handlers} />

        <Show when={loadingMore()}>
          <Switch>
            <Match when={viewMode() === "list" || viewMode() === "inbox"}>
              <ListPlaceholder count={4} />
            </Match>
            <Match when={viewMode() === "masonry"}>
              <MasonryPlaceholder count={6} />
            </Match>
            <Match when={true}>
              <For each={Array(3).fill(0)}>{() => <FeedPlaceholder />}</For>
            </Match>
          </Switch>
        </Show>

        <Show when={hasMore() && !loadingMore()}>
          <div class="flex justify-center py-4">
            <button
              onClick={loadMore}
              class="px-4 py-2 text-sm font-medium rounded-lg border border-rim
                     bg-surface text-muted hover:bg-overlay transition-colors"
            >
              Load more
            </button>
          </div>
        </Show>

        <Show when={!hasMore() && posts().length > 0}>
          <p class="text-center py-4 text-sm text-muted">You're all caught up</p>
        </Show>
      </Show>
    </div>
  );
}
