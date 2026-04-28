// src/shared/stream/feedviews/InboxView.tsx
import { For, Show, createSignal } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import formatPostDate from "@/shared/lib/date";
import { useI18n } from "@/i18n";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function flattenThread(node: ThreadNode): ThreadNode[] {
  return [node, ...node.children.flatMap(flattenThread)];
}

function InlineThread(props: { thread: ThreadNode; handlers: StreamHandlers }) {
  const all = flattenThread(props.thread);
  const [replyBody, setReplyBody] = createSignal("");

  const submit = () => {
    const text = replyBody().trim();
    if (!text) return;
    props.handlers.onComment(
      props.thread.mid, text,
      props.thread.authorName, props.thread.authorAvatar,
    );
    setReplyBody("");
  };

  return (
    <div class="border-t border-rim bg-overlay px-4 py-3">
      <div class="space-y-4 max-h-96 overflow-y-auto pr-1">
        <For each={all}>
          {(msg) => (
            <div class="flex gap-3">
              <Show
                when={msg.authorAvatar}
                fallback={
                  <div class="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-txt
                              flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                    {msg.authorName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                }
              >
                <img src={msg.authorAvatar} alt={msg.authorName}
                  class="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5" />
              </Show>
              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-2">
                  <span class="text-xs font-semibold text-txt">{msg.authorName}</span>
                  <span class="text-[11px] text-muted">{msg.created?.slice(0, 16)}</span>
                </div>
                <div
                  class="text-sm text-muted mt-0.5 leading-relaxed
                         [&>p]:my-0.5 [&_img]:max-w-xs [&_img]:rounded-lg
                         [&_.bb-share]:mt-2 [&_.bb-share]:rounded-xl [&_.bb-share]:border [&_.bb-share]:border-rim
                         [&_.bb-share]:bg-surface [&_.bb-share]:overflow-hidden [&_.bb-share_br]:hidden
                         [&_.bb-share-header]:flex [&_.bb-share-header]:items-center
                         [&_.bb-share-header]:gap-2 [&_.bb-share-header]:px-3 [&_.bb-share-header]:py-2
                         [&_.bb-share-header]:text-xs [&_.bb-share-header]:text-muted
                         [&_.bb-share-header]:border-b [&_.bb-share-header]:border-rim
                         [&_.share-avatar]:!w-6 [&_.share-avatar]:!h-6 [&_.share-avatar]:rounded-full
                         [&_.share-avatar]:object-cover [&_.share-avatar]:shrink-0 [&_.share-avatar]:!my-0
                         [&_.bb-share-header_a]:font-medium [&_.bb-share-header_a]:text-txt
                         [&_.bb-share-header_a:hover]:underline
                         [&_.bb-share-content]:block [&_.bb-share-content]:px-3
                         [&_.bb-share-content]:py-2.5 [&_.bb-share-content]:text-sm
                         [&_.bb-share-content]:text-muted [&_.bb-share-content]:border-l-0 [&_.bb-share-content]:pl-0"
                  innerHTML={msg.body}
                />
                <button
                  onClick={() => props.handlers.onLike(msg.mid)}
                  class="mt-1 flex items-center gap-1 text-[11px] transition-colors"
                  classList={{ "text-accent": msg.viewerLiked, "text-muted hover:text-accent": !msg.viewerLiked }}
                >
                  <svg class="w-3 h-3" fill={msg.viewerLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <Show when={msg.likeCount > 0}>{msg.likeCount}</Show>
                </button>
              </div>
            </div>
          )}
        </For>
      </div>

      <Show when={props.thread.iid}>
        <div class="flex gap-2 mt-3 pt-3 border-t border-rim">
          <textarea
            value={replyBody()}
            onInput={(e) => setReplyBody(e.currentTarget.value)}
            rows={2}
            placeholder="Reply to thread…"
            class="flex-1 text-sm rounded-lg border border-rim bg-surface px-3 py-2 resize-none text-txt
                   focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button onClick={submit}
            class="self-end px-3 py-1.5 text-xs font-medium rounded-lg bg-accent text-white hover:opacity-80 transition-opacity">
            Send
          </button>
        </div>
      </Show>
    </div>
  );
}

function InboxRow(props: { thread: ThreadNode; handlers: StreamHandlers }) {
  const [expanded, setExpanded] = createSignal(false);
  const p = props.thread;
  const allParticipants = [
    ...new Set(flattenThread(p).map((n) => n.authorName).filter(Boolean)),
  ];
  const replyCount = flattenThread(p).length - 1;
  const preview = stripHtml(p.body).slice(0, 100);
  const { locale } = useI18n();

  return (
    <div class="border-b border-rim last:border-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-overlay transition-colors text-txt"
      >
        <div class="w-2 h-2 rounded-full shrink-0"
          classList={{ "bg-accent": !p.viewerLiked && replyCount === 0, "bg-transparent": p.viewerLiked || replyCount > 0 }} />

        <div class="flex -space-x-1.5 shrink-0">
          <For each={allParticipants.slice(0, 3)}>
            {(name) => {
              const node = flattenThread(p).find((n) => n.authorName === name);
              return (
                <Show when={node?.authorAvatar}
                  fallback={
                    <div class="w-6 h-6 rounded-full ring-2 ring-surface bg-gradient-to-br from-accent to-accent-txt
                                flex items-center justify-center text-white text-[9px] font-bold">
                      {name?.[0]?.toUpperCase()}
                    </div>
                  }
                >
                  <img src={node!.authorAvatar} alt={name}
                    class="w-6 h-6 rounded-full object-cover ring-2 ring-surface" />
                </Show>
              );
            }}
          </For>
        </div>

        <span class="text-xs font-semibold text-txt w-36 shrink-0 truncate">
          {allParticipants.slice(0, 2).join(", ")}
          <Show when={allParticipants.length > 2}>
            <span class="text-muted"> +{allParticipants.length - 2}</span>
          </Show>
        </span>

        <span class="flex-1 text-xs min-w-0 truncate">
          <Show when={p.title}><span class="font-medium text-txt mr-1.5">{p.title}</span></Show>
          <span class="text-muted">{preview}</span>
        </span>

        <Show when={replyCount > 0}>
          <span class="shrink-0 text-[11px] bg-accent-muted text-muted rounded-full px-2 py-0.5">{replyCount}</span>
        </Show>

        <span class="text-[11px] text-muted w-14 text-right shrink-0"
          title={new Date(p.created + "Z").toLocaleString(locale())}>
          {formatPostDate(p.created, locale())}
        </span>

        <svg class="w-4 h-4 text-muted shrink-0 transition-transform"
          classList={{ "rotate-180": expanded() }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Show when={expanded()}>
        <InlineThread thread={p} handlers={props.handlers} />
      </Show>
    </div>
  );
}

export default function InboxView(props: { posts: ThreadNode[]; handlers: StreamHandlers }) {
  return (
    <div class="bg-surface rounded-xl border border-rim shadow-sm overflow-hidden">
      <div class="flex items-center gap-3 px-4 py-2.5 border-b border-rim
                  bg-overlay text-[11px] text-muted font-medium uppercase tracking-wide">
        <span class="w-2 shrink-0" />
        <span class="w-6 shrink-0" />
        <span class="w-36 shrink-0">Participants</span>
        <span class="flex-1">Subject</span>
        <span class="w-14 text-right shrink-0">Date</span>
        <span class="w-4 shrink-0" />
      </div>
      <For each={props.posts}
        fallback={<p class="text-center py-16 text-muted text-sm">Nothing here yet.</p>}
      >
        {(thread) => <InboxRow thread={thread} handlers={props.handlers} />}
      </For>
    </div>
  );
}
