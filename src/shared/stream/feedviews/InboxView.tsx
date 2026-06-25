// src/shared/stream/feedviews/InboxView.tsx
import { For, Show, createSignal, onMount, onCleanup } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import { flattenThread } from "@/shared/lib/thread";
import { useThreadMode } from "@/shared/store/thread-mode";
import { REACTION_VERBS } from "@/shared/stream/store/actions-store";
import type { StreamHandlers } from "../types";
import formatPostDate from "@/shared/lib/date";
import { useI18n } from "@/i18n";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import { useAuth } from "@/shared/store/auth-store";
import DOMPurify from "dompurify";
import { markItemSeen } from "@/shared/lib/markSeen";

// ── helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  const raw = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const el = document.createElement("textarea");
  el.innerHTML = raw;
  return el.value;
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
        "text-subtle hover:text-accent": !props.active && props.direction === "up",
        "text-subtle hover:text-subtle/60": !props.active && props.direction === "down",
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

function MessageRow(props: {
  msg: ThreadNode;
  depth: number;
  handlers: StreamHandlers;
  locale: string;
}) {
  const { t } = useI18n();
  return (
    <div
      class="flex gap-2.5 px-3 py-2.5"
      style={{ "padding-left": `${12 + props.depth * 20}px` }}
    >
      <Show
        when={props.msg.authorAvatar}
        fallback={
          <div class="w-6 h-6 rounded-full bg-accent-muted text-accent flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 uppercase">
            {props.msg.authorName?.[0] ?? "?"}
          </div>
        }
      >
        <img
          src={props.msg.authorAvatar}
          alt={props.msg.authorName}
          class="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
        />
      </Show>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-1.5 mb-0.5">
          <span class="text-[11px] font-semibold text-txt">{props.msg.authorName}</span>
          <span
            class="text-[10px] text-muted"
            title={new Date(props.msg.created + "Z").toLocaleString(props.locale)}
          >
            {formatPostDate(props.msg.created, props.locale)}
          </span>
        </div>
        <div
          class="text-sm text-txt/80 leading-relaxed [&>p]:my-0.5 [&_img]:max-w-xs [&_img]:rounded"
          innerHTML={props.msg.body}
        />
        <button
          onClick={() => props.handlers.onLike(props.msg.mid)}
          class="mt-1 flex items-center gap-1 text-[10px] transition-colors"
          classList={{
            "text-accent": props.msg.viewerLiked,
            "text-subtle hover:text-accent": !props.msg.viewerLiked,
          }}
        >
          <svg class="w-3 h-3" fill={props.msg.viewerLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 15l-6-6-6 6" />
          </svg>
          <Show when={props.msg.likeCount > 0}>{props.msg.likeCount}</Show>
          <span>{t("post.like")}</span>
        </button>
      </div>
    </div>
  );
}

function ThreadedNodes(props: {
  nodes: ThreadNode[];
  depth: number;
  handlers: StreamHandlers;
  locale: string;
}) {
  return (
    <For each={props.nodes}>
      {(node) => (
        <>
          <MessageRow msg={node} depth={props.depth} handlers={props.handlers} locale={props.locale} />
          <Show when={node.children.length > 0}>
            <ThreadedNodes nodes={node.children} depth={props.depth + 1} handlers={props.handlers} locale={props.locale} />
          </Show>
        </>
      )}
    </For>
  );
}

function InlineThread(props: {
  thread: ThreadNode;
  handlers: StreamHandlers;
  profileUid: number;
}) {
  const threadMode = useThreadMode();
  const flat = () => flattenThread(props.thread);
  const { locale } = useI18n();

  return (
    <div
      class="border-t border-rim bg-base"
      onClick={(e) => e.stopPropagation()}
    >
      <div class="max-h-[60vh] overflow-y-auto divide-y divide-rim">
        <Show
          when={threadMode()}
          fallback={
            <For each={flat()}>
              {(msg, i) => (
                <MessageRow
                  msg={msg as ThreadNode}
                  depth={i() === 0 ? 0 : 1}
                  handlers={props.handlers}
                  locale={locale()}
                />
              )}
            </For>
          }
        >
          {/* threaded: root node first, then its children nested */}
          <MessageRow msg={props.thread} depth={0} handlers={props.handlers} locale={locale()} />
          <ThreadedNodes nodes={props.thread.children} depth={1} handlers={props.handlers} locale={locale()} />
        </Show>
      </div>

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
  const { locale, t } = useI18n();
  let rowRef!: HTMLDivElement;

  onMount(() => {
    if (!p.uuid || !p.flags.includes("unseen")) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          markItemSeen(p.uuid);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(rowRef);
    onCleanup(() => observer.disconnect());
  });

  const replyCount = () =>
    p.children.length > 0
      ? flattenThread(p).filter(n => !REACTION_VERBS.has(n.verb ?? '')).length - 1
      : (p.commentCount ?? 0);
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
  const isUnseen = () => p.flags.includes("unseen");

  return (
    <div
      ref={rowRef}
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
          <div class="flex items-center gap-1.5">
            <Show when={isUnseen()}>
              <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-fg leading-none shrink-0">
                New
              </span>
            </Show>
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
          </div>

          {/* preview */}
          <Show when={p.title && preview()}>
            <p class="text-xs text-muted leading-relaxed line-clamp-2">
              {preview()}
            </p>
          </Show>

          {/* participants row */}
          <div class="flex items-center gap-1.5 pt-0.5 flex-wrap">

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

            <span class="text-[11px] text-muted font-medium truncate max-w-[160px]">
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

            <Show when={p.via}>
              <span class="text-[11px] text-muted/50">·</span>
              <svg class="w-2.5 h-2.5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span class="text-[11px] text-muted">via</span>
              <a href={p.via!.url} class="text-[11px] text-muted hover:underline font-medium truncate max-w-[120px]">
                {p.via!.name}
              </a>
            </Show>

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
              {replyCount() === 1 ? t("ui.reply") : t("ui.replies")}
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
              <span class="hidden sm:inline">{t("post.source")}</span>
            </a>
          </Show>
        </div>

        {/* inline thread */}
        <Show when={expanded() && commentsLoading()}>
          <div class="px-3 py-2 text-xs text-muted animate-pulse border-t border-rim">
            {t("post.loading_comments")}
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
  const { t } = useI18n();
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
            <p class="text-sm">{t("network.all_caught_up")}</p>
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
