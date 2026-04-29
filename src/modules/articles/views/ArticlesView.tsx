// src/modules/articles/views/ArticlesView.tsx
import { createEffect, Show, For, Switch, Match } from "solid-js";
import { useParams } from "@solidjs/router";
import { useAuth } from "@/shared/store/auth-store";
import {
  posts, loading, loadingMore, hasMore, newPosts,
  loadArticles, resetPosts, loadMore, flushNewPosts,
  handleLike, handleDislike, handleRepeat, handleComment,
} from "../store";
import StreamList from "@/shared/stream/feedviews/StreamList";
import type { StreamHandlers } from "@/shared/stream/types";
import { FeedPlaceholder } from "@/shared/stream/feedviews/FeedView";
import { ListPlaceholder } from "@/shared/stream/feedviews/ListView";
import { MasonryPlaceholder } from "@/shared/stream/feedviews/MasonryView";
import { ViewSwitcher } from "@/shared/stream/filters";
import { viewMode, changeView } from "../store";

const handlers: StreamHandlers = {
  onLike: handleLike,
  onDislike: handleDislike,
  onRepeat: handleRepeat,
  onComment: handleComment,
};

export default function ArticlesView() {
  const auth = useAuth();
  const params = useParams<{ nick: string }>();
  let initialized = false;

  createEffect(() => {
    if (auth.loading) return;
    if (initialized) return;
    initialized = true;
    resetPosts();
    loadArticles(params.nick);
  });

  return (
    <div class="relative">
      {/* Add an ArticlesFilters / ViewSwitcher here when ready */}
<ViewSwitcher
  viewMode={viewMode()}
  onChange={changeView}
  available={["feed", "masonry", "list"]}
/>
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
            <Match when={viewMode() === "list"}>
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
            <Match when={viewMode() === "list"}>
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
          <p class="text-center py-4 text-sm text-muted">All articles loaded</p>
        </Show>
      </Show>
    </div>
  );
}
