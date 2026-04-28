// src/shared/stream/feedviews/ListView.tsx
import { For, Show, createSignal } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import PostDetailModal from "@/shared/views/PostDetailModal";
import formatPostDate from "@/shared/lib/date";
import { useI18n } from "@/i18n";

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function ListRow(props: { post: ThreadNode; handlers: StreamHandlers; index: number }) {
  const p = props.post;
  const preview = stripHtml(p.body).slice(0, 120);
  const replyCount = p.children.length;
  const [showModal, setShowModal] = createSignal(false);
  const { locale } = useI18n();

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        class="group flex items-center gap-3 px-4 py-2.5 border-b border-rim
               hover:bg-overlay transition-colors cursor-pointer"
      >
        <Show
          when={p.authorAvatar}
          fallback={
            <div class="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-txt
                        flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              {p.authorName?.[0]?.toUpperCase() ?? "?"}
            </div>
          }
        >
          <img src={p.authorAvatar} alt={p.authorName} class="w-6 h-6 rounded-full object-cover shrink-0" />
        </Show>

        <span class="text-xs font-semibold text-txt w-28 shrink-0 truncate">{p.authorName}</span>

        <span class="flex-1 text-xs text-muted truncate min-w-0">
          <Show when={p.title}>
            <span class="font-medium text-txt mr-1.5">{p.title}</span>
          </Show>
          {preview}
        </span>

        <div
          class="flex items-center gap-2 shrink-0 transition-opacity"
          classList={{ "opacity-0 group-hover:opacity-100": !p.viewerLiked && !p.viewerRepeated }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); props.handlers.onLike(p.mid); }}
            class="flex items-center gap-0.5 text-[11px] transition-colors"
            classList={{ "text-accent": p.viewerLiked, "text-muted hover:text-accent": !p.viewerLiked }}
          >
            <svg class="w-3 h-3" fill={p.viewerLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <Show when={p.likeCount > 0}>{p.likeCount}</Show>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); props.handlers.onRepeat(p.mid); }}
            class="flex items-center gap-0.5 text-[11px] transition-colors"
            classList={{ "text-accent": p.viewerRepeated, "text-muted hover:text-accent": !p.viewerRepeated }}
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <Show when={p.repeatCount > 0}>{p.repeatCount}</Show>
          </button>
          <Show when={replyCount > 0}>
            <span class="text-[11px] text-muted">{replyCount}↩</span>
          </Show>
        </div>

        <span class="text-[11px] text-muted shrink-0 w-16 text-right"
          title={new Date(p.created + "Z").toLocaleString(locale())}>
          {formatPostDate(p.created, locale())}
        </span>
      </div>

      <Show when={showModal()}>
        <PostDetailModal uuid={p.uuid} onClose={() => setShowModal(false)} />
      </Show>
    </>
  );
}

function ListRowPlaceholder() {
  return (
    <div class="flex items-center gap-3 px-4 py-2.5 border-b border-rim animate-pulse">
      <div class="w-6 h-6 rounded-full bg-accent-muted shrink-0" />
      <div class="w-28 shrink-0"><div class="h-2.5 bg-accent-muted rounded w-20" /></div>
      <div class="flex-1 flex items-center gap-2 min-w-0">
        <div class="h-2.5 bg-accent-muted rounded w-24 shrink-0" />
        <div class="h-2.5 bg-accent-muted rounded flex-1" />
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <div class="h-2.5 bg-accent-muted rounded w-6" />
        <div class="h-2.5 bg-accent-muted rounded w-6" />
      </div>
      <div class="w-16 flex justify-end shrink-0">
        <div class="h-2.5 bg-accent-muted rounded w-10" />
      </div>
    </div>
  );
}

export default function ListView(props: { posts: ThreadNode[]; handlers: StreamHandlers }) {
  return (
    <div class="bg-surface rounded-xl border border-rim shadow-sm overflow-hidden">
      <div class="flex items-center gap-3 px-4 py-2 border-b border-rim
                  bg-overlay text-[11px] text-muted font-medium uppercase tracking-wide">
        <span class="w-6 shrink-0" />
        <span class="w-28 shrink-0">From</span>
        <span class="flex-1">Subject</span>
        <span class="w-24 text-right shrink-0">Date</span>
      </div>
      <For
        each={props.posts}
        fallback={<p class="text-center py-16 text-muted text-sm">Nothing here yet.</p>}
      >
        {(post, i) => <ListRow post={post} handlers={props.handlers} index={i()} />}
      </For>
    </div>
  );
}

export function ListPlaceholder(props: { count?: number }) {
  return (
    <div class="bg-surface rounded-xl border border-rim shadow-sm overflow-hidden">
      <For each={Array(props.count ?? 8).fill(0)}>{() => <ListRowPlaceholder />}</For>
    </div>
  );
}
