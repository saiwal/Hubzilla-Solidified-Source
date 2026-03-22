import { onMount, For, Show } from "solid-js";
import { posts, loadNetwork, loading } from "./store";
import StreamList from "../../components/StreamList";
function PostPlaceholder() {
  return (
    <div class="animate-pulse bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4 shadow-sm">
      {/* Header */}
      <div class="flex items-start gap-3">
        <div class="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0 ring-1 ring-zinc-200 dark:ring-zinc-700" />
        <div class="flex flex-col gap-1.5 pt-1">
          <div class="h-3.5 bg-zinc-200 dark:bg-zinc-700 rounded w-32" />
          <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
        </div>
      </div>

      {/* Body */}
      <div class="mt-4 space-y-2">
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-full" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-5/6" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-4/6" />
      </div>

      {/* Footer */}
      <div class="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-5">
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
        <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-8" />
      </div>
    </div>
  );
}

export default function Network() {
  onMount(loadNetwork);
  return (
    <>
      <Show when={loading()}>
        <For each={Array(5).fill(0)}>
          {() => <PostPlaceholder />}
        </For>
      </Show>
      <Show when={!loading()}>
        <StreamList posts={posts()} />
      </Show>
    </>
  );
}
