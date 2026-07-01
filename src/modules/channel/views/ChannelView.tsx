// src/modules/channel/views/ChannelView.tsx
import { createEffect, createSignal, onCleanup, Show, For, Switch, Match } from "solid-js";
import { useParams, useSearchParams, useNavigate } from "@solidjs/router";
import { useI18n } from "@/i18n";
import { useScrollStyle } from "@/shared/store/scroll-style";
import {
  posts,
  loading,
  loadingMore,
  hasMore,
  newPosts,
  profileUid,
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
import { MdFillSearch, MdFillClose, MdFillCreate } from "solid-icons/md";
import { lazy } from "solid-js";
import { useAuth } from "@/shared/store/auth-store";
const PostComposer = lazy(() => import("@/shared/editor/composers/PostComposer"));

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
  const navigate = useNavigate();
  const { t } = useI18n();
  const scrollStyle = useScrollStyle();

  const currentSearch = () => {
    const v = searchParams.search;
    return v ? (Array.isArray(v) ? v[0] : v) : "";
  };

  const [searchOpen, setSearchOpen] = createSignal(!!searchParams.search);
  const [searchInput, setSearchInput] = createSignal(currentSearch());
  const [composeOpen, setComposeOpen] = createSignal(false);
  const [composeEverOpened, setComposeEverOpened] = createSignal(false);
  const openCompose = () => { setComposeEverOpened(true); setComposeOpen(true); };
  const auth = useAuth();
  const isVisitor = () => (auth()?.uid ?? 0) > 0 && auth()!.uid !== profileUid();

  const submitSearch = (e?: Event) => {
    e?.preventDefault();
    const q = searchInput().trim();
    setSearchParams({ search: q || undefined });
    if (!q) setSearchOpen(false);
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchParams({ search: undefined });
    setSearchOpen(false);
  };

  const mid = () => {
    const v = searchParams.mid;
    return v ? (Array.isArray(v) ? v[0] : v) : null;
  };

  createEffect(() => {
    const uuid = mid();
    if (uuid) { navigate(`/display/${uuid}`, { replace: true }); return; }
  });

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
    if (scrollStyle() !== "endless") return;
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
      <div class="flex items-center mb-4">
        <div class="flex-1" />

        <ViewSwitcher
          viewMode={viewMode()}
          onChange={changeView}
          available={["feed", "masonry", "list"]}
        />

        <div class="flex-1 flex justify-end items-center gap-1.5">
          <Show when={profileUid() > 0}>
            <button
              title={t("channel.compose")}
              onClick={openCompose}
              class="p-1.5 rounded-lg border border-rim bg-surface text-muted hover:bg-elevated hover:text-txt transition-colors"
            >
              <MdFillCreate size={15} />
            </button>
          </Show>
          <Show
            when={searchOpen()}
            fallback={
              <button
                title={t("channel.search")}
                onClick={() => { setSearchInput(currentSearch()); setSearchOpen(true); }}
                class={`p-1.5 rounded-lg border transition-colors
                  ${currentSearch()
                    ? "bg-accent text-accent-fg border-accent"
                    : "border-rim bg-surface text-muted hover:bg-elevated hover:text-txt"}`}
              >
                <MdFillSearch size={15} />
              </button>
            }
          >
            <form onSubmit={submitSearch} class="flex items-center gap-1">
              <input
                type="search"
                value={searchInput()}
                onInput={(e) => setSearchInput(e.currentTarget.value)}
                placeholder={t("channel.search_placeholder")}
                autofocus
                onKeyDown={(e) => { if (e.key === "Escape") setSearchOpen(false); }}
                class="w-36 px-2 py-1 text-sm rounded-lg border border-rim bg-surface text-txt outline-none focus:border-accent"
              />
              <button
                type="submit"
                class="p-1.5 rounded-lg border border-rim bg-elevated text-txt hover:bg-overlay transition-colors"
              >
                <MdFillSearch size={15} />
              </button>
              <button
                type="button"
                onClick={clearSearch}
                class="p-1.5 text-muted hover:text-txt transition-colors"
              >
                <MdFillClose size={15} />
              </button>
            </form>
          </Show>
        </div>
      </div>

      <Show when={searchParams.cat || searchParams.tag || searchParams.dbegin || searchParams.search}>
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/25 text-sm mb-3">
          <span class="text-muted">{t("channel.filtered_by")}</span>
          <Show when={searchParams.search}>
            <span class="font-medium text-accent">"{currentSearch()}"</span>
          </Show>
          <Show when={searchParams.cat}>
            <span class="font-medium text-accent">{searchParams.cat}</span>
          </Show>
          <Show when={searchParams.tag}>
            <span class="font-medium text-accent">#{searchParams.tag}</span>
          </Show>
          <Show when={searchParams.dbegin}>
            <span class="font-medium text-accent">
              {new Date(String(searchParams.dbegin) + "T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
          </Show>
          <button
            type="button"
            onClick={() => setSearchParams({ cat: undefined, tag: undefined, dbegin: undefined, dend: undefined, search: undefined })}
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

        <Show when={hasMore() && !loadingMore() && scrollStyle() === "load_more"}>
          <div class="flex justify-center py-4">
            <button
              onClick={loadMore}
              class="px-4 py-2 text-sm font-medium rounded-lg border border-rim
                     bg-surface text-muted hover:bg-overlay transition-colors"
            >
              {t("channel.load_more")}
            </button>
          </div>
        </Show>
      </Show>

      <div ref={sentinel} class="h-1" />

      <Show when={!hasMore() && posts().length > 0}>
        <p class="text-center text-xs text-muted py-6">{t("channel.all_caught_up")}</p>
      </Show>

      <Show when={composeEverOpened()}>
        <PostComposer
          open={composeOpen()}
          onClose={() => setComposeOpen(false)}
          profileUid={profileUid()}
          hideAcl={isVisitor()}
          onPosted={() => loadChannel(params.nick ?? "")}
        />
      </Show>
    </>
  );
}
