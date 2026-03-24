// components/views/FeedView.tsx
import { For, Show, createSignal } from 'solid-js';
import type { ThreadNode } from '../../core/utils/thread';
import { handleLike, handleDislike, handleRepeat, handleComment } from '../../modules/network/store';

function ActionBar(props: { post: ThreadNode }) {
  const p = props.post;
  return (
    <div class="flex items-center gap-1 mt-3">
      <button
        onClick={() => handleLike(p.mid, p.iid!)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20
               text-gray-500 dark:text-gray-400 hover:text-rose-500"
        classList={{ 'text-rose-500 bg-rose-50 dark:bg-rose-900/20': p.viewerLiked }}
      >
        <svg class="w-3.5 h-3.5" fill={p.viewerLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
        <Show when={p.likeCount > 0}><span>{p.likeCount}</span></Show>
      </button>

      <button
        onClick={() => handleDislike(p.mid, p.iid!)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-amber-50 dark:hover:bg-amber-900/20
               text-gray-500 dark:text-gray-400 hover:text-amber-500"
        classList={{ 'text-amber-500 bg-amber-50 dark:bg-amber-900/20': p.viewerDisliked }}
      >
        <svg class="w-3.5 h-3.5" fill={p.viewerDisliked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/>
        </svg>
        <Show when={p.dislikeCount > 0}><span>{p.dislikeCount}</span></Show>
      </button>

      <button
        onClick={() => handleRepeat(p.mid, p.iid!)}
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
               transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-900/20
               text-gray-500 dark:text-gray-400 hover:text-emerald-500"
        classList={{ 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20': p.viewerRepeated }}
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        <Show when={p.repeatCount > 0}><span>{p.repeatCount}</span></Show>
      </button>
    </div>
  );
}

function CommentBox(props: { post: ThreadNode; onClose: () => void }) {
  const [body, setBody] = createSignal('');
  const submit = () => {
    const text = body().trim();
    if (!text) return;
    handleComment(props.post.mid, props.post.iid!, text, 'Me', '');
    setBody('');
    props.onClose();
  };
  return (
    <div class="mt-3 flex gap-2">
      <textarea
        value={body()}
        onInput={e => setBody(e.currentTarget.value)}
        rows={2}
        placeholder="Write a reply…"
        class="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600
               bg-white dark:bg-gray-800 px-3 py-2 resize-none
               focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      />
      <div class="flex flex-col gap-1">
        <button onClick={submit}
          class="px-3 py-1 text-xs font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors">
          Reply
        </button>
        <button onClick={props.onClose}
          class="px-3 py-1 text-xs rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function ThreadedPost(props: { post: ThreadNode; depth?: number }) {
  const [showReply, setShowReply] = createSignal(false);
  const depth = props.depth ?? 0;

  return (
    <div classList={{ 'ml-8 border-l-2 border-gray-100 dark:border-gray-700 pl-4': depth > 0 }}>
      <div class="py-3">
        <div class="flex items-start gap-3">
          <Show when={props.post.authorAvatar} fallback={
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shrink-0 flex items-center justify-center text-white text-xs font-bold">
              {props.post.authorName?.[0]?.toUpperCase() ?? '?'}
            </div>
          }>
            <img src={props.post.authorAvatar} alt={props.post.authorName}
              class="w-8 h-8 rounded-full object-cover shrink-0"/>
          </Show>
          <div class="flex-1 min-w-0">
            <div class="flex items-baseline gap-2 flex-wrap">
              <a href={props.post.authorUrl}
                class="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:underline">
                {props.post.authorName}
              </a>
              <span class="text-xs text-gray-400">{props.post.created?.slice(0, 16)}</span>
              <Show when={props.post.verb && props.post.verb !== 'Create'}>
                <span class="text-xs text-gray-400 italic">{props.post.verb?.toLowerCase()}</span>
              </Show>
            </div>
            <Show when={props.post.title}>
              <p class="text-sm font-medium text-gray-800 dark:text-gray-200 mt-0.5">{props.post.title}</p>
            </Show>
            <div class="prose prose-sm dark:prose-invert max-w-none mt-1 text-gray-700 dark:text-gray-300
                        [&>p]:my-1 [&>blockquote]:border-l-2 [&>blockquote]:pl-3 [&>blockquote]:text-gray-500
                        [&_img]:max-w-full [&_img]:rounded-lg [&_img]:mt-2"
              innerHTML={props.post.body}/>
            <ActionBar post={props.post}/>
            <Show when={props.post.iid}>
              <button onClick={() => setShowReply(v => !v)}
                class="mt-1 text-xs text-gray-400 hover:text-blue-500 transition-colors">
                Reply
              </button>
            </Show>
            <Show when={showReply()}>
              <CommentBox post={props.post} onClose={() => setShowReply(false)}/>
            </Show>
          </div>
        </div>
      </div>
      <Show when={props.post.children.length > 0}>
        <For each={props.post.children}>
          {child => <ThreadedPost post={child} depth={depth + 1}/>}
        </For>
      </Show>
    </div>
  );
}

export default function FeedView(props: { posts: ThreadNode[] }) {
  return (
    <div class="max-w-2xl mx-auto divide-y divide-gray-100 dark:divide-gray-800">
      <For each={props.posts} fallback={
        <p class="text-center py-16 text-gray-400 text-sm">Nothing here yet.</p>
      }>
        {post => (
          <div class="bg-white dark:bg-gray-800 rounded-xl mb-3 px-4 shadow-sm
                      border border-gray-100 dark:border-gray-700/50">
            <ThreadedPost post={post}/>
          </div>
        )}
      </For>
    </div>
  );
}
