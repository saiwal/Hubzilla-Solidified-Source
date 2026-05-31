// src/shared/stream/feedviews/ListView.tsx
import { For, Show, createSignal, lazy, onMount, onCleanup } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import { countAllComments } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import formatPostDate from "@/shared/lib/date";
import { useI18n } from "@/i18n";
import DOMPurify from "dompurify";
import { markItemSeen } from "@/shared/lib/markSeen";

const PostDetailModal = lazy(() => import("@/shared/views/PostDetailModal"));

// ── helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ── vote gutter ───────────────────────────────────────────────────────────────

function VoteGutter(props: {
  post: ThreadNode;
  handlers: StreamHandlers;
}) {
  const p = props.post;
  const score = () => (p.likeCount ?? 0) - (p.dislikeCount ?? 0);

  return (
    <div
      class="flex flex-col items-center justify-center gap-0.5 w-10 shrink-0
             bg-surface/60 border-r border-rim px-1 py-2 self-stretch"
      onClick={(e) => e.stopPropagation()}
    >
      {/* upvote */}
      <button
        onClick={() => props.handlers.onLike(p.mid)}
        class="flex items-center justify-center w-6 h-5 rounded transition-colors"
        classList={{
          "text-accent": p.viewerLiked,
          "text-subtle hover:text-accent": !p.viewerLiked,
        }}
      >
        <svg
          class="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill={p.viewerLiked ? "currentColor" : "none"}
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>

      {/* score */}
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

      {/* downvote */}
      <button
        onClick={() => props.handlers.onDislike(p.mid)}
        class="flex items-center justify-center w-6 h-5 rounded transition-colors"
        classList={{
          "text-accent": p.viewerDisliked,
          "text-subtle hover:text-subtle/60": !p.viewerDisliked,
        }}
      >
        <svg
          class="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill={p.viewerDisliked ? "currentColor" : "none"}
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

// ── single row ────────────────────────────────────────────────────────────────

function ListRow(props: {
  post: ThreadNode;
  handlers: StreamHandlers;
  index: number;
  onOpenModal: () => void;
}) {
  const p = props.post;
  const preview = () => stripHtml(p.body).slice(0, 160);
  const replyCount = () =>
    p.children.length > 0
      ? countAllComments(p.children)
      : (p.commentCount ?? 0);
  const { locale } = useI18n();
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

  return (
    <>
      <div ref={rowRef} class="group flex items-stretch border-b border-rim last:border-0 hover:bg-overlay transition-colors">
        {/* vote gutter */}
        <VoteGutter post={p} handlers={props.handlers} />

        {/* main content */}
        <div class="flex-1 min-w-0 flex flex-col">

          {/* clickable body — title → preview → author */}
          <div
            onClick={() => props.onOpenModal()}
            class="flex-1 min-w-0 px-3 pt-2.5 pb-1.5 cursor-pointer space-y-0.5"
          >
            <Show when={p.flags.includes("unseen")}>
              <span class="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-fg leading-none">
                New
              </span>
            </Show>
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
                class="text-sm font-semibold text-txt leading-snug line-clamp-1"
                innerHTML={DOMPurify.sanitize(p.title!)}
              />
            </Show>

            {/* preview — only shown when there's a title */}
            <Show when={p.title && preview()}>
              <p class="text-xs text-muted leading-relaxed line-clamp-2">
                {preview()}
              </p>
            </Show>

            {/* author row */}
            <div class="flex items-center gap-1.5 pt-0.5">
              <Show
                when={p.authorAvatar}
                fallback={
                  <div class="w-4 h-4 rounded-full bg-accent-muted text-accent flex items-center justify-center text-[9px] font-bold shrink-0 uppercase">
                    {p.authorName?.[0] ?? "?"}
                  </div>
                }
              >
                <img
                  src={p.authorAvatar}
                  alt={p.authorName}
                  class="w-4 h-4 rounded-full object-cover shrink-0"
                />
              </Show>
              <span class="text-[11px] text-muted font-medium truncate">
                {p.authorName}
              </span>
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
                <a href={p.via!.url} class="text-[11px] text-muted hover:underline font-medium truncate">
                  {p.via!.name}
                </a>
              </Show>
            </div>
          </div>

          {/* action bar */}
          <div
            class="flex items-center gap-0.5 px-2 pb-1.5 transition-opacity"
            classList={{
              "opacity-40 group-hover:opacity-100":
                !p.viewerRepeated,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* repeat */}
            <button
              onClick={() => props.handlers.onRepeat(p.mid)}
              class="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors"
              classList={{
                "text-accent bg-accent-muted": p.viewerRepeated,
                "text-muted hover:text-txt hover:bg-elevated": !p.viewerRepeated,
              }}
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <Show when={p.repeatCount > 0}>
                <span>{p.repeatCount}</span>
              </Show>
              <span class="hidden sm:inline">Boost</span>
            </button>

            {/* comments */}
            <Show when={replyCount() > 0}>
              <button
                onClick={() => props.onOpenModal()}
                class="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md
                       text-muted hover:text-txt hover:bg-elevated transition-colors"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>{replyCount()}</span>
                <span class="hidden sm:inline">
                  {replyCount() > 1 ? "Comments" : "Comment"}
                </span>
              </button>
            </Show>
          </div>

        </div>
      </div>
    </>
  );
}

// ── placeholder row ───────────────────────────────────────────────────────────

function ListRowPlaceholder() {
  return (
    <div class="flex items-stretch border-b border-rim last:border-0 animate-pulse">
      {/* vote gutter skeleton */}
      <div class="flex flex-col items-center justify-center gap-1 w-10 shrink-0 bg-surface/60 border-r border-rim px-1 py-3">
        <div class="w-3 h-3 bg-accent-muted rounded" />
        <div class="w-4 h-2 bg-accent-muted rounded" />
        <div class="w-3 h-3 bg-accent-muted rounded" />
      </div>

      {/* content skeleton */}
      <div class="flex-1 flex flex-col px-3 pt-2.5 pb-1.5 gap-1.5">
        {/* title */}
        <div class="h-3 bg-accent-muted rounded w-2/3" />
        {/* preview lines */}
        <div class="h-2.5 bg-accent-muted rounded w-full" />
        <div class="h-2.5 bg-accent-muted rounded w-4/5" />
        {/* author row */}
        <div class="flex items-center gap-1.5 mt-0.5">
          <div class="w-4 h-4 rounded-full bg-accent-muted shrink-0" />
          <div class="h-2 bg-accent-muted rounded w-20" />
          <div class="h-2 bg-accent-muted rounded w-10" />
        </div>
        {/* action bar */}
        <div class="flex items-center gap-2 mt-0.5">
          <div class="h-5 bg-accent-muted rounded w-14" />
          <div class="h-5 bg-accent-muted rounded w-20" />
        </div>
      </div>
    </div>
  );
}

// ── main export ───────────────────────────────────────────────────────────────

export default function ListView(props: {
  posts: ThreadNode[];
  handlers: StreamHandlers;
}) {
  const [modalUuid, setModalUuid] = createSignal<string | null>(null);

  return (
    <>
      <div class="bg-surface rounded-xl border border-rim shadow-sm overflow-hidden">
        <For
          each={props.posts}
          fallback={
            <div class="flex flex-col items-center justify-center py-16 gap-2 text-muted">
              <svg
                class="w-8 h-8 opacity-30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.5"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p class="text-sm">Nothing here yet.</p>
            </div>
          }
        >
          {(post, i) => (
            <ListRow
              post={post}
              handlers={props.handlers}
              index={i()}
              onOpenModal={() => setModalUuid(post.uuid)}
            />
          )}
        </For>
      </div>
      <Show when={modalUuid()}>
        {(uuid) => (
          <PostDetailModal
            uuid={uuid()}
            onClose={() => setModalUuid(null)}
            handlers={props.handlers}
          />
        )}
      </Show>
    </>
  );
}

export function ListPlaceholder(props: { count?: number }) {
  return (
    <div class="bg-surface rounded-xl border border-rim shadow-sm overflow-hidden">
      <For each={Array(props.count ?? 8).fill(0)}>
        {() => <ListRowPlaceholder />}
      </For>
    </div>
  );
}
