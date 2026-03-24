import { onMount } from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import { posts, loading, loadChannel } from "./store";
import {
  handleLike,
  handleDislike,
  handleRepeat,
  handleComment,
} from "./store";
import { For, Show } from "solid-js";
import PostCard from "../../components/PostCard";
import type { PostActions } from "../../components/PostCard";
import type { ChannelParams } from "./api";

const actions: PostActions = {
  onLike:    handleLike,
  onDislike: handleDislike,
  onRepeat:  handleRepeat,
  onComment: handleComment,
};

export default function Channel() {
  const params       = useParams<{ nick?: string }>();
  const [searchParams] = useSearchParams();

  onMount(() => {
    const s = (key: string) => {
      const v = searchParams[key];
      return v ? String(Array.isArray(v) ? v[0] : v) : undefined;
    };

    const p: ChannelParams = {};
    const order = s('order');
    if (order)      p.order  = order as ChannelParams['order'];
    if (s('search')) p.search = s('search');
    if (s('tag'))    p.tag    = s('tag');
    if (s('cat'))    p.cat    = s('cat');
    if (s('mid'))    p.mid    = s('mid');
    if (s('dend'))   p.dend   = s('dend');
    if (s('dbegin')) p.dbegin = s('dbegin');

    // Empty string → PHP falls back to local_channel()
    loadChannel(params.nick ?? '', p);
  });

  return (
    <>
      <Show when={loading()}>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">Loading…</p>
      </Show>

      <Show when={!loading() && posts().length === 0}>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">No posts yet.</p>
      </Show>

      <For each={posts()}>
        {post => <PostCard post={post} actions={actions} />}
      </For>
    </>
  );
}

