import StreamList from "./feedviews/StreamList";
import { ListPlaceholder } from "./feedviews/ListView";
import { MasonryPlaceholder } from "./feedviews/MasonryView";
import { FeedPlaceholder } from "./feedviews/FeedView";
import { createEffect, Show, For, Switch, Match } from "solid-js";
import { useAuth } from "@/shared/store/auth-store";
import {
  viewMode,
  posts,
  loadNetwork,
  resetPosts,
  loading,
  loadMore,
  loadingMore,
  hasMore,
  newPosts,
  flushNewPosts,
} from "../store/store";
import StreamFilters from "./StreamFilters";
import ViewSwitcher from "./ViewSwitcher";

export default function DashboardView() {
  const auth = useAuth();
  let initialized = false;

  createEffect(() => {
    if (auth.loading) return;
    console.log("effect fired, initialized:", initialized);
    if (initialized) return;
    initialized = true;
    resetPosts();
    loadNetwork({ order: "created" });
  });

  return (
    <div class="relative">
      <StreamFilters />
      <ViewSwitcher />

      <Show when={newPosts().length > 0}>
        <div class="sticky top-2 z-10 flex justify-center">
          <button
            onClick={flushNewPosts}
            class="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-medium shadow-lg hover:bg-blue-700 transition-colors"
          >
            ↑ {newPosts().length} new{" "}
            {newPosts().length === 1 ? "post" : "posts"}
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
        <StreamList posts={posts()} />
        <Show when={loadingMore()}>
          <p class="text-center py-4 text-sm text-gray-500">
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
          </p>
        </Show>
        <Show when={hasMore() && !loadingMore()}>
          <div class="flex justify-center py-4">
            <button
              onClick={loadMore}
              class="px-4 py-2 text-sm font-medium rounded-lg border border-rim
             bg-surface text-gray-600 dark:text-gray-300
             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Load more
            </button>
          </div>
        </Show>

        <Show when={!hasMore() && posts().length > 0}>
          <p class="text-center py-4 text-sm text-gray-400">
            You're all caught up
          </p>
        </Show>
      </Show>
    </div>
  );
}
