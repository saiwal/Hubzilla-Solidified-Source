// components/views/MasonryView.tsx
import { For, Show, createSignal } from 'solid-js';
import type { ThreadNode } from '../../../../shared/hooks/thread';
import { handleLike, handleRepeat } from '../../../network/store/store';
import PostDetailModal from '../../../../shared/ui/PostDetailModal';

function MasonryCard(props: { post: ThreadNode }) {
  const p = props.post;
  const replyCount = p.children.length;
  const [showModal, setShowModal] = createSignal(false);

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        class="break-inside-avoid mb-3 bg-white dark:bg-gray-800
               border border-gray-100 dark:border-gray-700/50
               rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        <div class="flex items-center gap-2 mb-3">
          <Show when={p.authorAvatar} fallback={
            <div class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600
                        flex items-center justify-center text-white text-xs font-bold shrink-0">
              {p.authorName?.[0]?.toUpperCase() ?? '?'}
            </div>
          }>
            <img src={p.authorAvatar} alt={p.authorName} class="w-7 h-7 rounded-full object-cover shrink-0"/>
          </Show>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{p.authorName}</p>
            <p class="text-xs text-gray-400">{p.created?.slice(0, 10)}</p>
          </div>
        </div>

        <Show when={p.title}>
          <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 leading-snug">{p.title}</p>
        </Show>

        <div
          class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed
                 [&>p]:my-0.5 [&_img]:w-full [&_img]:rounded-lg [&_img]:mt-2 [&_img]:mb-1
                 [&>blockquote]:border-l-2 [&>blockquote]:pl-2 [&>blockquote]:text-gray-400
                 line-clamp-[12]"
          innerHTML={p.body}
        />

        <div
          class="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50"
          onClick={(e) => e.stopPropagation()} // reaction clicks don't open modal
        >
          <button
            onClick={() => handleLike(p.mid, p.iid!)}
            class="flex items-center gap-1 text-xs transition-colors"
            classList={{
              'text-rose-500': p.viewerLiked,
              'text-gray-400 hover:text-rose-400': !p.viewerLiked,
            }}
          >
            <svg class="w-3.5 h-3.5" fill={p.viewerLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            {p.likeCount || ''}
          </button>

          <button
            onClick={() => handleRepeat(p.mid, p.iid!)}
            class="flex items-center gap-1 text-xs transition-colors"
            classList={{
              'text-emerald-500': p.viewerRepeated,
              'text-gray-400 hover:text-emerald-400': !p.viewerRepeated,
            }}
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {p.repeatCount || ''}
          </button>

          <Show when={replyCount > 0}>
            <span class="ml-auto text-xs text-gray-400">
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </span>
          </Show>
        </div>
      </div>

      <Show when={showModal()}>
        <PostDetailModal uuid={p.uuid} onClose={() => setShowModal(false)} />
      </Show>
    </>
  );
}

export default function MasonryView(props: { posts: ThreadNode[] }) {
  return (
    <div class="columns-1 sm:columns-2 lg:columns-3 gap-3">
      <For each={props.posts} fallback={
        <p class="text-center py-16 text-gray-400 text-sm col-span-3">Nothing here yet.</p>
      }>
        {post => <MasonryCard post={post}/>}
      </For>
    </div>
  );
}
