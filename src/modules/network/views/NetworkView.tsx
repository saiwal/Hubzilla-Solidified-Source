import StreamList from "./feedviews/StreamList";
import { ListPlaceholder } from "./feedviews/ListView";
import { MasonryPlaceholder } from "./feedviews/MasonryView";
import {
  createEffect,
  onCleanup,
  Show,
  For,
  Switch,
  Match,
  onMount,
} from "solid-js";
import { useAuth } from "../../../shared/store/auth-store";
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

export function PostPlaceholder() {
  return (
    <div class="animate-pulse bg-white dark:bg-gray-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4 shadow-sm">
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
  onMount(() => {
    const container =
      document.querySelector("main.overflow-y-auto") ??
      document.querySelector("main");

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container!;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        loadMore();
      }
    };

    container?.addEventListener("scroll", handleScroll, { passive: true });
    onCleanup(() => container?.removeEventListener("scroll", handleScroll));
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
              <For each={Array(5).fill(0)}>{() => <PostPlaceholder />}</For>
            </Match>
          </Switch>
        }
      >
        <StreamList posts={posts()} />

        <Show when={loadingMore()}>
          <p class="text-center py-4 text-sm text-gray-500">Loading more…</p>
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
