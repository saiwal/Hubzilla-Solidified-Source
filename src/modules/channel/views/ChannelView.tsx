// src/modules/channel/views/ChannelView.tsx
import { createEffect, onCleanup, Show, For, Switch, Match } from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import {
  posts,
  loading,
  loadingMore,
  hasMore,
  newPosts,
  loadChannel,
  loadMore,
  flushNewPosts,
  stopPolling,
  handleLike,
  handleDislike,
  handleRepeat,
  handleComment,
} from "../store";
import StreamList from "@/shared/stream/feedviews/StreamList";
import type { StreamHandlers } from "@/shared/stream/types";
import { ListPlaceholder } from "@/shared/stream/feedviews/ListView";
import { MasonryPlaceholder } from "@/shared/stream/feedviews/MasonryView";
import { FeedPlaceholder } from "@/shared/stream/feedviews/FeedView";
import type { ChannelParams } from "../api";
import ProfileView from "./ProfileView";
import { ViewSwitcher } from "@/shared/stream/filters";
import { viewMode, changeView } from "../store";
import { useViewerRole } from "@/shared/store/site-config";

const handlers: StreamHandlers = {
  onLike: handleLike,
  onDislike: handleDislike,
  onRepeat: handleRepeat,
  onComment: handleComment,
};

export default function ChannelView() {
  const params = useParams<{ nick: string }>();
  const [searchParams] = useSearchParams();

const role = useViewerRole();
  createEffect(() => {
    const str = (key: string): string | undefined => {
      const v = searchParams[key];
      return v ? String(Array.isArray(v) ? v[0] : v) : undefined;
    };
    const p: ChannelParams = {
      ...(str("order") && { order: str("order") as ChannelParams["order"] }),
      ...(str("search") && { search: str("search") }),
      ...(str("tag") && { tag: str("tag") }),
      ...(str("cat") && { cat: str("cat") }),
      ...(str("mid") && { mid: str("mid") }),
      ...(str("dend") && { dend: str("dend") }),
      ...(str("dbegin") && { dbegin: str("dbegin") }),
    };
    loadChannel(params.nick ?? "", p);
  });

  onCleanup(() => stopPolling());

  let sentinel!: HTMLDivElement;
  createEffect(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      <ProfileView />
      <ViewSwitcher
        viewMode={viewMode()}
        onChange={changeView}
        available={
          role() === "owner"
            ? ["feed", "masonry", "list", "inbox"]
            : ["feed", "masonry"]
        }
      />
      <Show when={newPosts().length > 0}>
        <button
          onClick={flushNewPosts}
          class="w-full mb-3 py-2 text-sm font-medium rounded-xl
                 bg-accent text-white border border-accent hover:opacity-90 transition-opacity"
        >
          ↑ {newPosts().length} new {newPosts().length === 1 ? "post" : "posts"}
        </button>
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
        <Show when={posts().length === 0}>
          <p class="text-sm text-muted py-4 text-center">No posts yet.</p>
        </Show>

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
      </Show>

      <div ref={sentinel} class="h-1" />

      <Show when={!hasMore() && posts().length > 0}>
        <p class="text-center text-xs text-muted py-6">You're all caught up.</p>
      </Show>
    </>
  );
}
