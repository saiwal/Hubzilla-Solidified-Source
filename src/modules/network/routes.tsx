import { onMount, onCleanup, Show } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import { posts, loadNetwork, loading, loadMore, loadingMore, hasMore, newPosts, flushNewPosts } from "./store";
import StreamList from "../../components/StreamList";
import type { NetworkParams } from "./api";

export default function Network() {
  const [searchParams] = useSearchParams();
  let sentinelRef!: HTMLDivElement;

  onMount(() => {
    const s = (key: string) => {
      const v = searchParams[key];
      return v ? String(Array.isArray(v) ? v[0] : v) : undefined;
    };

    const params: NetworkParams = { order: 'created' };
    const order = s('order');
    if (order)              params.order  = order as NetworkParams['order'];
    else params.order = "created";
    if (s('search'))        params.search = s('search');
    if (s('tag'))           params.tag    = s('tag');
    if (s('cat'))           params.cat    = s('cat');
    if (s('verb'))          params.verb   = s('verb');
    if (s('xchan'))         params.xchan  = s('xchan');
    if (s('net'))           params.net    = s('net');
    if (s('dend'))          params.dend   = s('dend');
    if (s('dbegin'))        params.dbegin = s('dbegin');
    if (s('gid'))           params.gid    = Number(s('gid'));
    if (s('cid'))           params.cid    = Number(s('cid'));
    if (s('cmin'))          params.cmin   = Number(s('cmin'));
    if (s('cmax'))          params.cmax   = Number(s('cmax'));
    if (searchParams.star)  params.star   = 1;
    if (searchParams.conv)  params.conv   = 1;
    if (searchParams.dm)    params.dm     = 1;

    loadNetwork(params);

    // Infinite scroll sentinel
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinelRef);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="relative">
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
        <p>Loading...</p>
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
