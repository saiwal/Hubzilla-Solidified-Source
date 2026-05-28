// src/shared/stream/feedviews/MasonryView.tsx
import {
  For,
  Show,
  createSignal,
  createMemo,
  onMount,
  onCleanup,
} from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import { countAllComments } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import PostDetailModal from "@/shared/views/PostDetailModal";
import formatPostDate from "@/shared/lib/date";
import { useI18n } from "@/i18n";
import DOMPurify from "dompurify";
import EventCard from "@/shared/stream/components/EventCard";
import { parseEventData } from "@/shared/lib/activity.mapper";
function useColumnCount(): () => number {
  const getCount = () => {
    const w = window.innerWidth;
    if (w >= 1024) return 3;
    if (w >= 640) return 2;
    return 1;
  };
  const [count, setCount] = createSignal(getCount());
  onMount(() => {
    const obs = new ResizeObserver(() => setCount(getCount()));
    obs.observe(document.documentElement);
    onCleanup(() => obs.disconnect());
  });
  return count;
}

function splitIntoColumns<T>(items: T[], n: number): T[][] {
  const cols: T[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => cols[i % n].push(item));
  return cols;
}

const COLLAPSED_MAX_PX = 200;

function MasonryCard(props: { post: ThreadNode; handlers: StreamHandlers; onOpenModal: () => void }) {
  const p = props.post;
  const replyCount = () =>
    p.children.length > 0
      ? countAllComments(p.children)
      : (p.commentCount ?? 0);
  const [expanded, setExpanded] = createSignal(false);
  let bodyRef!: HTMLDivElement;
  const [overflows, setOverflows] = createSignal(false);
  const { locale, t } = useI18n();
  const eventData = () =>
    p.eventData ??
    (p.body.includes("[event-summary]") ? parseEventData(p.body) : undefined);

  const checkOverflow = () => {
    const el = bodyRef;
    if (!el) return;
    const prev = el.style.maxHeight;
    el.style.maxHeight = "none";
    const natural = el.scrollHeight;
    el.style.maxHeight = prev;
    setOverflows(natural > COLLAPSED_MAX_PX);
  };

  onMount(() => {
    checkOverflow();
    const imgs = bodyRef?.querySelectorAll("img");
    imgs?.forEach((img) => {
      if (!img.complete) img.addEventListener("load", checkOverflow, { once: true });
    });
  });

  return (
    <>
      <div
        onClick={() => props.onOpenModal()}
        class="mb-3 bg-surface border border-rim rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        {/* Author */}
        <div class="flex items-center gap-2 mb-3">
          <Show
            when={p.authorAvatar}
            fallback={
              <div class="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-txt flex items-center justify-center text-accent-fg text-xs font-bold shrink-0">
                {p.authorName?.[0]?.toUpperCase() ?? "?"}
              </div>
            }
          >
            <img
              src={p.authorAvatar}
              alt={p.authorName}
              class="w-7 h-7 rounded-full object-cover shrink-0"
            />
          </Show>
          <div class="min-w-0">
            <div class="flex items-center gap-1.5">
              <p class="text-xs font-semibold text-txt truncate">
                {p.authorName}
              </p>
              <Show when={p.flags.includes("unseen")}>
                <span class="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-fg leading-none shrink-0">
                  New
                </span>
              </Show>
            </div>
            <p
              class="text-xs text-muted"
              title={new Date(p.created + "Z").toLocaleString(locale())}
            >
              {formatPostDate(p.created, locale())}
            </p>
            <Show when={p.verb === "Announce" && p.via}>
              <div class="flex items-center gap-1 mt-0.5">
                <svg class="w-2.5 h-2.5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="text-xs text-muted">via</span>
                <a href={p.via!.url} class="text-xs text-muted hover:underline font-medium truncate">
                  {p.via!.name}
                </a>
              </div>
            </Show>
          </div>
        </div>

        <Show when={p.title}>
          <p
            class="text-sm font-semibold text-txt mb-2 leading-snug"
            innerHTML={DOMPurify.sanitize(p.title!)}
          />
        </Show>
        {/* Event card */}
        <Show when={eventData()}>
          {(ev) => <EventCard post={p} event={ev()} />}
        </Show>

        {/* Body with height cap — hidden for pure event posts */}
        <Show when={!eventData()}>
        <div class="relative">
          <div
            class="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{
              "max-height": expanded() ? "2000px" : `${COLLAPSED_MAX_PX}px`,
            }}
          >
            <div
              ref={bodyRef}
              class="post-body text-sm text-muted leading-relaxed wrap-anywhere
                     [&>p]:my-0.5 [&_img:not(.share-avatar)]:w-full [&_img:not(.share-avatar)]:rounded-lg [&_img:not(.share-avatar)]:mt-2 [&_img:not(.share-avatar)]:mb-1
                     [&>blockquote]:border-l-2 [&>blockquote]:border-accent [&>blockquote]:pl-2 [&>blockquote]:text-accent"
              innerHTML={p.body}
            />
          </div>
          <Show when={overflows() && !expanded()}>
            <div
              class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface to-transparent flex items-end justify-center pb-1"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
            >
              <button
                class="flex items-center gap-1 text-xs text-accent hover:text-accent-txt
                             bg-overlay/90 px-2 py-0.5 rounded-full border border-accent/50 transition-colors"
              >
                <svg
                  class="w-3 h-3"
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
                {t("ui.show_more")}
              </button>
            </div>
          </Show>
        </div>

        <Show when={overflows() && expanded()}>
          <button
            class="flex items-center justify-center gap-1 text-xs text-accent hover:text-accent-txt mt-1 w-full transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(false);
            }}
          >
            <svg
              class="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M5 15l7-7 7 7"
              />
            </svg>
            {t("ui.show_less")}
          </button>
        </Show>
        </Show>{/* end !eventData */}

        {/* Actions */}
        <div
          class="flex items-center gap-3 mt-3 pt-3 border-t border-rim"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => props.handlers.onLike(p.mid)}
            class="flex items-center gap-1 text-xs transition-colors"
            classList={{
              "text-accent": p.viewerLiked,
              "text-muted hover:text-accent": !p.viewerLiked,
            }}
          >
            <svg
              class="w-3.5 h-3.5"
              fill={p.viewerLiked ? "currentColor" : "none"}
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
            {p.likeCount || ""}
          </button>

          <button
            onClick={() => props.handlers.onRepeat(p.mid)}
            class="flex items-center gap-1 text-xs transition-colors"
            classList={{
              "text-accent": p.viewerRepeated,
              "text-muted hover:text-accent": !p.viewerRepeated,
            }}
          >
            <svg
              class="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {p.repeatCount || ""}
          </button>

          <Show when={replyCount() > 0}>
            <span class="ml-auto text-xs text-muted">
              {replyCount()} {replyCount() === 1 ? t("ui.reply") : t("ui.replies")}
            </span>
          </Show>
        </div>
      </div>

    </>
  );
}

export default function MasonryView(props: {
  posts: ThreadNode[];
  handlers: StreamHandlers;
}) {
  const [modalUuid, setModalUuid] = createSignal<string | null>(null);
  const colCount = useColumnCount();
  const columns = createMemo(() => splitIntoColumns(props.posts, colCount()));

  return (
    <>
      <Show
        when={props.posts.length > 0}
        fallback={
          <p class="text-center py-16 text-muted text-sm">Nothing here yet.</p>
        }
      >
        <div class="flex gap-3 items-start">
          <For each={columns()}>
            {(col) => (
              <div class="flex-1 flex flex-col min-w-0">
                <For each={col}>
                  {(post) => (
                    <MasonryCard
                      post={post}
                      handlers={props.handlers}
                      onOpenModal={() => setModalUuid(post.uuid)}
                    />
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </Show>
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

export function MasonryPlaceholder(props: { count?: number }) {
  const colCount = useColumnCount();
  const heights = [
    "h-24",
    "h-36",
    "h-20",
    "h-32",
    "h-28",
    "h-16",
    "h-40",
    "h-24",
    "h-20",
    "h-32",
    "h-28",
    "h-36",
  ];
  const placeholders = createMemo(() =>
    Array(props.count ?? 12)
      .fill(0)
      .map((_, i) => ({ i })),
  );
  const columns = createMemo(() =>
    splitIntoColumns(placeholders(), colCount()),
  );

  return (
    <div class="flex gap-3 items-start">
      <For each={columns()}>
        {(col) => (
          <div class="flex-1 flex flex-col">
            <For each={col}>
              {({ i }) => (
                <div class="mb-3 bg-surface border border-rim rounded-xl p-4 shadow-sm animate-pulse">
                  <div class="flex items-center gap-2 mb-3">
                    <div class="w-7 h-7 rounded-full bg-accent-muted shrink-0" />
                    <div class="flex flex-col gap-1.5 min-w-0">
                      <div class="h-2.5 bg-accent-muted rounded w-24" />
                      <div class="h-2 bg-accent-muted rounded w-16" />
                    </div>
                  </div>
                  <div
                    class={`${heights[i % heights.length]} bg-accent-muted rounded-lg`}
                  />
                  <div class="flex items-center gap-3 mt-3 pt-3 border-t border-rim">
                    <div class="h-2.5 bg-accent-muted rounded w-6" />
                    <div class="h-2.5 bg-accent-muted rounded w-6" />
                  </div>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
}
