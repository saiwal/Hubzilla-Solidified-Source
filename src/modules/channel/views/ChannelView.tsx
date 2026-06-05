// src/modules/channel/views/ChannelView.tsx
import { createEffect, onCleanup, Show, For, Switch, Match } from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import { useI18n } from "@/i18n";
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
  handleStar,
  handleDelete,
  handleComment,
  loadComments,
  handleRefresh,
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
  onLike:          handleLike,
  onDislike:       handleDislike,
  onRepeat:        handleRepeat,
  onComment:       handleComment,
  onLoadComments:  loadComments,
  onStar:          handleStar,
  onDelete:        handleDelete,
  onRefresh:       handleRefresh,
};

export default function ChannelView() {
  const params = useParams<{ nick: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useI18n();

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
      <Show when={searchParams.cat || searchParams.tag}>
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/25 text-sm mb-3">
          <span class="text-muted">{t("channel.filtered_by")}</span>
          <Show when={searchParams.cat}>
            <span class="font-medium text-accent">{searchParams.cat}</span>
          </Show>
          <Show when={searchParams.tag}>
            <span class="font-medium text-accent">#{searchParams.tag}</span>
          </Show>
          <button
            type="button"
            onClick={() => setSearchParams({ cat: undefined, tag: undefined })}
            class="ml-auto text-xs text-muted hover:text-txt transition-colors"
          >
            {t("channel.clear")}
          </button>
        </div>
      </Show>

      <Show when={newPosts().length > 0}>
        <button
          onClick={flushNewPosts}
          class="w-full mb-3 py-2 text-sm font-medium rounded-xl
                 bg-accent text-accent-fg border border-accent hover:opacity-90 transition-opacity"
        >
          ↑ {newPosts().length} {newPosts().length === 1 ? t("channel.new_post") : t("channel.new_posts")}
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
          <p class="text-sm text-muted py-4 text-center">{t("channel.no_posts")}</p>
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
        <p class="text-center text-xs text-muted py-6">{t("channel.all_caught_up")}</p>
      </Show>
    </>
  );
}
