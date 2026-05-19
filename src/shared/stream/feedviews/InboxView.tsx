// src/shared/stream/feedviews/InboxView.tsx
import { For, Show, createSignal } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import { flattenThread } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import formatPostDate from "@/shared/lib/date";
import { useI18n } from "@/i18n";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import { useAuth } from "@/shared/store/auth-store";
import DOMPurify from "dompurify";

// ── helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getParticipants(thread: ThreadNode) {
  return [
    ...new Set(
      flattenThread(thread)
        .map((n) => n.authorName)
        .filter(Boolean),
    ),
  ];
}

// ── vote button ───────────────────────────────────────────────────────────────

function VoteButton(props: {
  active: boolean;
  direction: "up" | "down";
  onClick: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        props.onClick();
      }}
      class="flex items-center justify-center w-6 h-5 rounded transition-colors"
      classList={{
        "text-accent": props.active,
        "text-muted hover:text-accent": !props.active && props.direction === "up",
        "text-muted hover:text-muted/60": !props.active && props.direction === "down",
      }}
    >
      <svg
        class="w-3.5 h-3.5"
        viewBox="0 0 24 24"
        fill={props.active ? "currentColor" : "none"}
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <Show when={props.direction === "up"} fallback={<path d="M6 9l6 6 6-6" />}>
          <path d="M18 15l-6-6-6 6" />
        </Show>
      </svg>
    </button>
  );
}

// ── inline thread expanded panel ──────────────────────────────────────────────

function InlineThread(props: {
  thread: ThreadNode;
  handlers: StreamHandlers;
  profileUid: number;
}) {
  const all = () => flattenThread(props.thread);
  const { locale } = useI18n();

  return (
    <div
      class="border-t border-rim bg-base"
      onClick={(e) => e.stopPropagation()}
    >
      {/* messages */}
      <div class="max-h-72 overflow-y-auto divide-y divide-rim">
        <For each={all()}>
          {(msg, i) => (
            <div
              class="flex gap-2.5 px-3 py-2.5"
              classList={{ "pl-9": i() > 0 }}
            >
              <Show
                when={msg.authorAvatar}
                fallback={
                  <div class="w-6 h-6 rounded-full bg-accent-muted text-accent flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 uppercase">
                    {msg.authorName?.[0] ?? "?"}
                  </div>
                }
              >
                <img
                  src={msg.authorAvatar}
                  alt={msg.authorName}
                  class="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                />
              </Show>

              <div class="flex-1 min-w-0">
                <div class="flex items-baseline gap-1.5 mb-0.5">
                  <span class="text-[11px] font-semibold text-txt">{msg.authorName}</span>
                  <span
                    class="text-[10px] text-muted"
                    title={new Date(msg.created + "Z").toLocaleString(locale())}
                  >
                    {formatPostDate(msg.created, locale())}
                  </span>
                </div>
                <div
                  class="text-sm text-txt/80 leading-relaxed
                         [&>p]:my-0.5 [&_img]:max-w-xs [&_img]:rounded
                         [&_.bb-share]:mt-1.5 [&_.bb-share]:rounded-lg [&_.bb-share]:border
                         [&_.bb-share]:border-rim [&_.bb-share]:bg-surface [&_.bb-share]:overflow-hidden
                         [&_.bb-share_br]:hidden [&_.bb-share-content]:px-2.5 [&_.bb-share-content]:py-2
                         [&_.bb-share-content]:text-xs [&_.bb-share-content]:text-muted"
                  innerHTML={msg.body}
                />
                <button
                  onClick={() => props.handlers.onLike(msg.mid)}
                  class="mt-1 flex items-center gap-1 text-[10px] transition-colors"
                  classList={{
                    "text-accent": msg.viewerLiked,
                    "text-muted hover:text-accent": !msg.viewerLiked,
                  }}
                >
                  <svg class="w-3 h-3" fill={msg.viewerLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 15l-6-6-6 6" />
                  </svg>
                  <Show when={msg.likeCount > 0}>{msg.likeCount}</Show>
                  <span>upvote</span>
                </button>
              </div>
            </div>
          )}
        </For>
      </div>

      {/* reply composer */}
      <Show when={props.thread.iid}>
        <div class="px-3 py-2.5 border-t border-rim bg-surface/40">
          <CommentComposer
            parentMid={props.thread.mid}
            parentIid={props.thread.iid!}
            profileUid={props.profileUid}
            onSubmitted={(body) =>
              props.handlers.onComment(
                props.thread.mid,
                body,
                props.thread.authorName,
                props.thread.authorAvatar,
              )
            }
          />
        </div>
      </Show>
    </div>
  );
}

// Persists across remounts caused by setNodeChildren updating the thread reference.
const expandedByMid = new Set<string>();

// ── single inbox row ──────────────────────────────────────────────────────────

function InboxRow(props: {
  thread: ThreadNode;
  handlers: StreamHandlers;
  profileUid: number;
}) {
  const p = props.thread;
  const [expanded, setExpanded] = createSignal(expandedByMid.has(p.mid));
  const [commentsLoaded, setCommentsLoaded] = createSignal(p.children.length > 0);
  const [commentsLoading, setCommentsLoading] = createSignal(false);
  const { locale } = useI18n();

  const replyCount = () =>
    p.children.length > 0 ? flattenThread(p).length - 1 : (p.commentCount ?? 0);
  const participants = () => getParticipants(p);

  async function toggleExpand() {
    const next = !expanded();
    if (next) expandedByMid.add(p.mid);
    else expandedByMid.delete(p.mid);
    setExpanded(next);

    if (next && !commentsLoaded() && (p.commentCount ?? 0) > 0) {
      setCommentsLoading(true);
      try {
        await props.handlers.onLoadComments(p.mid, p.uuid);
        setCommentsLoaded(true);
      } finally {
        setCommentsLoading(false);
      }
    }
  }
  const score = () => (p.likeCount ?? 0) - (p.dislikeCount ?? 0);
  const preview = () => stripHtml(p.body).slice(0, 160);
  const isUnread = () => !p.viewerLiked && replyCount() === 0;

  return (
    <div
      class="group border-b border-rim last:border-0 flex items-stretch hover:bg-overlay transition-colors"
      classList={{ "bg-accent-muted/10": expanded() }}
    >
      {/* vote gutter */}
      <div
        class="flex flex-col items-center justify-center gap-0.5 w-10 shrink-0
               bg-surface/60 border-r border-rim px-1 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <VoteButton
          direction="up"
          active={p.viewerLiked}
          onClick={() => props.handlers.onLike(p.mid)}
        />
        <span
          class="text-[11px] font-bold tabular-nums leading-none"
          classList={{
            "text-accent": score() > 0,
            "text-muted": score() === 0,
            "text-subtle": score() < 0,
          }}
        >
          {score()}
        </span>
        <VoteButton
          direction="down"
          active={p.viewerDisliked}
          onClick={() => props.handlers.onDislike(p.mid)}
        />
      </div>

      {/* main column */}
      <div class="flex-1 min-w-0 flex flex-col">

        {/* clickable body — toggles inline thread */}
        <div
          onClick={toggleExpand}
          class="flex-1 min-w-0 px-3 pt-2.5 pb-1.5 cursor-pointer space-y-0.5 select-none"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && toggleExpand()}
        >
          {/* title */}
          <Show
            when={p.title}
            fallback={
              <p class="text-sm font-semibold text-txt leading-snug line-clamp-1">
                {preview()}
              </p>
            }
          >
            <p
              class="text-sm font-semibold leading-snug line-clamp-1"
              classList={{ "text-accent": isUnread(), "text-txt": !isUnread() }}
              innerHTML={DOMPurify.sanitize(p.title!)}
            />
          </Show>

          {/* preview */}
          <Show when={p.title && preview()}>
            <p class="text-xs text-muted leading-relaxed line-clamp-2">
              {preview()}
            </p>
          </Show>

          {/* participants row */}
          <div class="flex items-center gap-1.5 pt-0.5 flex-wrap">
            <div
              class="w-1.5 h-1.5 rounded-full shrink-0"
              classList={{ "bg-accent": isUnread(), "bg-transparent": !isUnread() }}
            />

            <div class="flex -space-x-1 shrink-0">
              <For each={participants().slice(0, 3)}>
                {(name) => {
                  const node = flattenThread(p).find((n) => n.authorName === name);
                  return (
                    <Show
                      when={node?.authorAvatar}
                      fallback={
                        <div class="w-4 h-4 rounded-full ring-1 ring-base bg-accent-muted text-accent flex items-center justify-center text-[9px] font-bold uppercase shrink-0">
                          {name?.[0]}
                        </div>
                      }
                    >
                      <img
                        src={node!.authorAvatar}
                        alt={name}
                        class="w-4 h-4 rounded-full object-cover ring-1 ring-base shrink-0"
                      />
                    </Show>
                  );
                }}
              </For>
            </div>

            <span class="text-[11px] text-subtle font-medium truncate max-w-[160px]">
              {participants().slice(0, 2).join(", ")}
            </span>
            <Show when={participants().length > 2}>
              <span class="text-[11px] text-muted">+{participants().length - 2}</span>
            </Show>

            <span class="text-[11px] text-muted/50">·</span>

            <span
              class="text-[11px] text-muted whitespace-nowrap"
              title={new Date(p.created + "Z").toLocaleString(locale())}
            >
              {formatPostDate(p.created, locale())}
            </span>

            <svg
              class="w-3 h-3 text-muted/50 ml-auto transition-transform duration-200"
              classList={{ "rotate-180": expanded() }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* action bar */}
        <div
          class="flex items-center gap-0.5 px-2 pb-1.5 transition-opacity"
          classList={{ "opacity-40 group-hover:opacity-100": replyCount() === 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* replies — toggles inline thread */}
          <button
            onClick={toggleExpand}
            class="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md
                   text-muted hover:text-txt hover:bg-elevated transition-colors"
            classList={{ "text-accent bg-accent-muted": expanded() }}
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <Show when={replyCount() > 0}>
              <span>{replyCount()}</span>
            </Show>
            <span class="hidden sm:inline">
              {replyCount() === 1 ? "Reply" : "Replies"}
            </span>
          </button>

          {/* link to original post */}
          <Show when={p.permalink}>
            <a
              href={p.permalink}
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md
                     text-muted hover:text-txt hover:bg-elevated transition-colors"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              <span class="hidden sm:inline">Original</span>
            </a>
          </Show>
        </div>

        {/* inline thread */}
        <Show when={expanded() && commentsLoading()}>
          <div class="px-3 py-2 text-xs text-subtle animate-pulse border-t border-rim">
            Loading replies…
          </div>
        </Show>
        <Show when={expanded() && !commentsLoading()}>
          <InlineThread
            thread={p}
            handlers={props.handlers}
            profileUid={props.profileUid}
          />
        </Show>

      </div>
    </div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

export default function InboxView(props: {
  posts: ThreadNode[];
  handlers: StreamHandlers;
}) {
  const auth = useAuth();
  const profileUid = () => auth()?.uid ?? 0;

  return (
    <div class="bg-surface border border-rim rounded-xl overflow-hidden shadow-sm">
      <For
        each={props.posts}
        fallback={
          <div class="flex flex-col items-center justify-center py-16 gap-2 text-muted">
            <svg class="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
            </svg>
            <p class="text-sm">Nothing here yet.</p>
          </div>
        }
      >
        {(thread) => (
          <InboxRow
            thread={thread}
            handlers={props.handlers}
            profileUid={profileUid()}
          />
        )}
      </For>
    </div>
  );
}
