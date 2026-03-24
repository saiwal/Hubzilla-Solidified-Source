// components/views/ListView.tsx
import { For, Show } from 'solid-js';
import type { ThreadNode } from '../../core/utils/thread';
import { handleLike, handleRepeat } from '../../modules/network/store';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function ListRow(props: { post: ThreadNode; index: number }) {
  const p = props.post;
  const preview = stripHtml(p.body).slice(0, 120);
  const replyCount = p.children.length;

  return (
    <div
      class="group flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800
             hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors cursor-pointer">

      {/* Avatar */}
      <Show when={p.authorAvatar} fallback={
        <div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500
                    flex items-center justify-center text-white text-[10px] font-bold shrink-0">
          {p.authorName?.[0]?.toUpperCase() ?? '?'}
        </div>
      }>
        <img src={p.authorAvatar} alt={p.authorName} class="w-6 h-6 rounded-full object-cover shrink-0"/>
      </Show>

      {/* Author name — fixed width */}
      <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 w-28 shrink-0 truncate">
        {p.authorName}
      </span>

      {/* Title or body preview */}
      <span class="flex-1 text-xs text-gray-600 dark:text-gray-400 truncate min-w-0">
        <Show when={p.title}>
          <span class="font-medium text-gray-800 dark:text-gray-200 mr-1.5">{p.title}</span>
        </Show>
        {preview}
      </span>

      {/* Actions — fade in on hover */}
      <div class="flex items-center gap-2 shrink-0 transition-opacity"
        classList={{ 'opacity-0 group-hover:opacity-100': !p.viewerLiked && !p.viewerRepeated }}>
        <button onClick={e => { e.stopPropagation(); handleLike(p.mid, p.iid!); }}
          class="flex items-center gap-0.5 text-[11px] transition-colors"
          classList={{
            'text-rose-500': p.viewerLiked,
            'text-gray-400 hover:text-rose-400': !p.viewerLiked
          }}>
          <svg class="w-3 h-3" fill={p.viewerLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
          <Show when={p.likeCount > 0}>{p.likeCount}</Show>
        </button>
        <button onClick={e => { e.stopPropagation(); handleRepeat(p.mid, p.iid!); }}
          class="flex items-center gap-0.5 text-[11px] transition-colors"
          classList={{
            'text-emerald-500': p.viewerRepeated,
            'text-gray-400 hover:text-emerald-400': !p.viewerRepeated
          }}>
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <Show when={p.repeatCount > 0}>{p.repeatCount}</Show>
        </button>
        <Show when={replyCount > 0}>
          <span class="text-[11px] text-gray-400">{replyCount}↩</span>
        </Show>
      </div>

      {/* Date */}
      <span class="text-[11px] text-gray-400 shrink-0 w-16 text-right">
        {p.created?.slice(5, 10)}
      </span>
    </div>
  );
}

export default function ListView(props: { posts: ThreadNode[] }) {
  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/50
                shadow-sm overflow-hidden">
      <div class="flex items-center gap-3 px-4 py-2 border-b border-gray-100 dark:border-gray-700
                  bg-gray-50 dark:bg-gray-800/80 text-[11px] text-gray-400 font-medium uppercase tracking-wide">
        <span class="w-6 shrink-0"/>
        <span class="w-28 shrink-0">From</span>
        <span class="flex-1">Subject</span>
        <span class="w-24 text-right shrink-0">Date</span>
      </div>
      <For each={props.posts} fallback={
        <p class="text-center py-16 text-gray-400 text-sm">Nothing here yet.</p>
      }>
        {(post, i) => <ListRow post={post} index={i()}/>}
      </For>
    </div>
  );
}
