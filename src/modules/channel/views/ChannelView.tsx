import { createEffect } from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import { posts, loading, loadChannel } from "../store/store";
import { handleLike, handleDislike, handleRepeat, handleComment } from "../store/store";
import { For, Show } from "solid-js";
import PostCard from "../../../shared/views/PostCard";
import type { PostActions } from "../../../shared/views/PostCard";
import type { ChannelParams } from "../api/api";

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

const actions: PostActions = {
  onLike:    handleLike,
  onDislike: handleDislike,
  onRepeat:  handleRepeat,
  onComment: handleComment,
};

export default function ChannelView() {
  const params = useParams<{ nick?: string }>();
  const [searchParams] = useSearchParams();

  // createEffect re-runs whenever params.nick or any searchParam changes,
  // so navigating between /channel/alice and /channel/bob reloads correctly
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

    // Empty string → PHP falls back to local_channel()
    loadChannel(params.nick ?? "", p);
  });

  return (
    <>
      <Show when={loading()}>
        <For each={Array(5).fill(0)}>
          {() => <PostPlaceholder />}
        </For>
      </Show>
      <Show when={!loading() && posts().length === 0}>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
          No posts yet.
        </p>
      </Show>
      <For each={posts()}>
        {(post) => <PostCard post={post} actions={actions} />}
      </For>
    </>
  );
}
