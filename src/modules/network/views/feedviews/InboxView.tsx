// components/views/InboxView.tsx
import { For, Show, createSignal } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import { handleLike, handleComment } from "@/modules/network/store/store";
import formatPostDate from "@/shared/lib/date";
import { useI18n } from "@/i18n";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function InlineThread(props: { thread: ThreadNode }) {
  const all = flattenThread(props.thread);
  const [replyBody, setReplyBody] = createSignal("");

  const submit = () => {
    const text = replyBody().trim();
    if (!text) return;
    handleComment(props.thread.mid, text, "Me", "");
    setReplyBody("");
  };

  return (
    <div class="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-4 py-3">
      <div class="space-y-4 max-h-96 overflow-y-auto pr-1">
        <For each={all}>
          {(msg) => (
            <div class="flex gap-3">
              <Show
                when={msg.authorAvatar}
                fallback={
                  <div
                    class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600
                            flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                  >
                    {msg.authorName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                }
              >
                <img
                  src={msg.authorAvatar}
                  alt={msg.authorName}
                  class="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                />
              </Show>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                  <span class="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {msg.authorName}
                  </span>
                  <span class="text-[11px] text-gray-400">
                    {msg.created?.slice(0, 16)}
                  </span>
                </div>
                <div
                  class="text-sm text-gray-700 dark:text-gray-300 mt-0.5 leading-relaxed
                            [&>p]:my-0.5 [&_img]:max-w-xs [&_img]:rounded-lg
                            [&_.bb-share]:mt-2 [&_.bb-share]:rounded-xl [&_.bb-share]:border
                            [&_.bb-share]:border-gray-200 [&_.bb-share]:dark:border-gray-700
                            [&_.bb-share]:bg-white [&_.bb-share]:dark:bg-gray-800/60
                            [&_.bb-share]:overflow-hidden
                            [&_.bb-share_br]:hidden
                            [&_.bb-share-header]:flex [&_.bb-share-header]:items-center
                            [&_.bb-share-header]:gap-2 [&_.bb-share-header]:px-3 [&_.bb-share-header]:py-2
                            [&_.bb-share-header]:text-xs [&_.bb-share-header]:text-gray-500
                            [&_.bb-share-header]:dark:text-gray-400
                            [&_.bb-share-header]:border-b [&_.bb-share-header]:border-gray-200
                            [&_.bb-share-header]:dark:border-gray-700
                            [&_.share-avatar]:!w-6 [&_.share-avatar]:!h-6
                            [&_.share-avatar]:rounded-full [&_.share-avatar]:object-cover
                            [&_.share-avatar]:shrink-0 [&_.share-avatar]:!my-0
                            [&_.bb-share-header_a]:font-medium [&_.bb-share-header_a]:text-gray-700
                            [&_.bb-share-header_a]:dark:text-gray-300
                            [&_.bb-share-header_a:hover]:underline
                            [&_.bb-share-content]:block [&_.bb-share-content]:px-3
                            [&_.bb-share-content]:py-2.5 [&_.bb-share-content]:text-sm
                            [&_.bb-share-content]:text-gray-700 [&_.bb-share-content]:dark:text-gray-300
                            [&_.bb-share-content]:border-l-0 [&_.bb-share-content]:pl-0"
                  innerHTML={msg.body}
                />
                <button
                  onClick={() => handleLike(msg.uuid)}
                  class="mt-1 flex items-center gap-1 text-[11px] transition-colors"
                  classList={{
                    "text-rose-500": msg.viewerLiked,
                    "text-gray-400 hover:text-rose-400": !msg.viewerLiked,
                  }}
                >
                  <svg
                    class="w-3 h-3"
                    fill={msg.viewerLiked ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  <Show when={msg.likeCount > 0}>{msg.likeCount}</Show>
                </button>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Reply composer */}
      <Show when={props.thread.iid}>
        <div class="flex gap-2 mt-3 pt-3 border-t border-rim">
          <textarea
            value={replyBody()}
            onInput={(e) => setReplyBody(e.currentTarget.value)}
            rows={2}
            placeholder="Reply to thread…"
            class="flex-1 text-sm rounded-lg border border-gray-200 dark:border-gray-600
                   bg-surface px-3 py-2 resize-none
                   focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            onClick={submit}
            class="self-end px-3 py-1.5 text-xs font-medium rounded-lg
                   bg-blue-500 text-white hover:bg-blue-600 transition-colors"
          >
            Send
          </button>
        </div>
      </Show>
    </div>
  );
}

// Flatten a thread to chronological list (root + all children)
function flattenThread(node: ThreadNode): ThreadNode[] {
  return [node, ...node.children.flatMap(flattenThread)];
}

function InboxRow(props: { thread: ThreadNode }) {
  const [expanded, setExpanded] = createSignal(false);
  const p = props.thread;
  const allParticipants = [
    ...new Set(
      flattenThread(p)
        .map((n) => n.authorName)
        .filter(Boolean),
    ),
  ];
  const replyCount = flattenThread(p).length - 1;
  const preview = stripHtml(p.body).slice(0, 100);
	const { locale } = useI18n();
  return (
    <div class="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        class="w-full text-left flex items-center gap-3 px-4 py-3
               hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
      >
      
        {/* Participants avatars */}
        <div class="flex -space-x-1.5 shrink-0">
          <For each={allParticipants.slice(0, 3)}>
            {(name) => {
              const node = flattenThread(p).find((n) => n.authorName === name);
              return (
                <Show
                  when={node?.authorAvatar}
                  fallback={
                    <div
                      class="w-6 h-6 rounded-full ring-2 ring-white dark:ring-gray-900
                              bg-gradient-to-br from-blue-400 to-indigo-500
                              flex items-center justify-center text-white text-[9px] font-bold"
                    >
                      {name?.[0]?.toUpperCase()}
                    </div>
                  }
                >
                  <img
                    src={node!.authorAvatar}
                    alt={name}
                    class="w-6 h-6 rounded-full object-cover ring-2 ring-white dark:ring-gray-900"
                  />
                </Show>
              );
            }}
          </For>
        </div>

        {/* Participant names */}
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300 w-36 shrink-0 truncate">
          {allParticipants.slice(0, 2).join(", ")}
          <Show when={allParticipants.length > 2}>
            <span class="text-gray-400"> +{allParticipants.length - 2}</span>
          </Show>
        </span>

        {/* Subject + preview */}
        <span class="flex-1 text-xs min-w-0 truncate">
          <Show when={p.title}>
            <span class="font-medium text-txt mr-1.5">
              {p.title}
            </span>
          </Show>
          <span class="text-gray-500">{preview}</span>
        </span>

        {/* Reply count badge */}
        <Show when={replyCount > 0}>
          <span
            class="shrink-0 text-[11px] bg-gray-100 dark:bg-gray-700
                       text-muted rounded-full px-2 py-0.5"
          >
            {replyCount}
          </span>
        </Show>

        {/* Date */}
        <span class="text-[11px] text-gray-400 w-14 text-right shrink-0" title={new Date(p.created + "Z").toLocaleString(locale())}>
          {formatPostDate(p.created, locale())}
        </span>

        {/* Chevron */}
        <svg
          class="w-4 h-4 text-gray-400 shrink-0 transition-transform"
          classList={{ "rotate-180": expanded() }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      <Show when={expanded()}>
        <InlineThread thread={p} />
      </Show>
    </div>
  );
}

export default function InboxView(props: { posts: ThreadNode[] }) {
  return (
    <div
      class="bg-surface rounded-xl border border-gray-100
                dark:border-gray-700/50 shadow-sm overflow-hidden"
    >
      <div
        class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-700
                  bg-gray-50 dark:bg-gray-800/80 text-[11px] text-gray-400 font-medium uppercase tracking-wide"
      >
        <span class="w-2 shrink-0" />
        <span class="w-6 shrink-0" />
        <span class="w-36 shrink-0">Participants</span>
        <span class="flex-1">Subject</span>
        <span class="w-14 text-right shrink-0">Date</span>
        <span class="w-4 shrink-0" />
      </div>
      <For
        each={props.posts}
        fallback={
          <p class="text-center py-16 text-gray-400 text-sm">
            Nothing here yet.
          </p>
        }
      >
        {(thread) => <InboxRow thread={thread} />}
      </For>
    </div>
  );
}
