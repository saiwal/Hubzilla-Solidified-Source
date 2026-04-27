// components/views/MasonryView.tsx
import {
  For,
  Show,
  createSignal,
  createMemo,
  onMount,
  onCleanup,
} from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import { handleLike, handleRepeat } from "@/modules/network/store/store";
import PostDetailModal from "@/shared/views/PostDetailModal";
import formatPostDate from "@/shared/lib/date";
import { useI18n } from "@/i18n";

// ── responsive column count ───────────────────────────────────────────────────

function useColumnCount(): () => number {
  const getCount = () => {
    const w = window.innerWidth;
    if (w >= 1024) return 3; // lg
    if (w >= 640) return 2; // sm
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

// ── helpers ───────────────────────────────────────────────────────────────────

function splitIntoColumns<T>(items: T[], n: number): T[][] {
  const cols: T[][] = Array.from({ length: n }, () => []);
  items.forEach((item, i) => cols[i % n].push(item));
  return cols;
}

// ── MasonryCard ───────────────────────────────────────────────────────────────

/** Max height (px) before the body is collapsed */
const COLLAPSED_MAX_PX = 200;

function MasonryCard(props: { post: ThreadNode }) {
  const p = props.post;
  const replyCount = p.children.length;
  const [showModal, setShowModal] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);

  /** Reference to the body div so we can measure its natural height */
  let bodyRef!: HTMLDivElement;
  const [overflows, setOverflows] = createSignal(false);
  const { locale, t } = useI18n();

  onMount(() => {
    // After the first paint, check whether the content is taller than the cap.
    // We temporarily remove the max-height constraint to measure true scrollHeight.
    const el = bodyRef;
    const prev = el.style.maxHeight;
    el.style.maxHeight = "none";
    const natural = el.scrollHeight;
    el.style.maxHeight = prev;
    setOverflows(natural > COLLAPSED_MAX_PX);
  });

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        class="mb-3 bg-surface
               border border-gray-100 dark:border-gray-700/50
               rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      >
        {/* ── Author row ── */}
        <div class="flex items-center gap-2 mb-3">
          <Show
            when={p.authorAvatar}
            fallback={
              <div
                class="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600
                        flex items-center justify-center text-white text-xs font-bold shrink-0"
              >
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
            <p class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
              {p.authorName}
            </p>
            <p
              class="text-xs text-gray-400"
              title={new Date(p.created + "Z").toLocaleString(locale())}
            >
              {" "}
              {formatPostDate(p.created, locale())}
            </p>
          </div>
        </div>

        {/* ── Title ── */}
        <Show when={p.title}>
          <p class="text-sm font-semibold text-txt mb-2 leading-snug">
            {p.title}
          </p>
        </Show>

        {/* ── Body with height cap ── */}
        <div class="relative">
          <div
            class="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{
              "max-height": expanded() ? "2000px" : `${COLLAPSED_MAX_PX}px`,
            }}
          >
            <div
              ref={bodyRef}
              class="post-body text-sm text-gray-600 dark:text-gray-400 leading-relaxed
                   [&>p]:my-0.5 [&_img]:w-full [&_img]:rounded-lg [&_img]:mt-2 [&_img]:mb-1
                   [&>blockquote]:border-l-2 [&>blockquote]:pl-2 [&>blockquote]:text-gray-400
                   wrap-anywhere
                   [&_.bb-share]:mt-2 [&_.bb-share]:rounded-xl [&_.bb-share]:border
                   [&_.bb-share]:border-gray-200 [&_.bb-share]:dark:border-gray-700
                   [&_.bb-share]:bg-gray-50 [&_.bb-share]:dark:bg-gray-800/60
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
                   [&_.bb-share-content]:block [&_.bb-share-content]:px-3
                   [&_.bb-share-content]:py-2.5 [&_.bb-share-content]:text-sm
                   [&_.bb-share-content]:text-gray-600 [&_.bb-share-content]:dark:text-gray-400
                   [&_.bb-share-content]:border-l-0 [&_.bb-share-content]:pl-0"
              innerHTML={p.body}
            />
          </div>

          {/* Fade + expand button — only when content actually overflows */}
          <Show when={overflows() && !expanded()}>
            <div
              class="absolute bottom-0 left-0 right-0 h-16
                     bg-gradient-to-t from-white dark:from-gray-800 to-transparent
                     flex items-end justify-center pb-1"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(true);
              }}
            >
              <button
                class="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400
                       hover:text-violet-700 dark:hover:text-violet-300
                       bg-white/90 dark:bg-gray-800/90 px-2 py-0.5 rounded-full
                       border border-violet-200 dark:border-violet-700/50
                       transition-colors"
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

        {/* Collapse button — shown after expanding */}
        <Show when={overflows() && expanded()}>
          <button
            class="flex items-center justify-center gap-1 text-xs text-violet-600 dark:text-violet-400
                   hover:text-violet-700 dark:hover:text-violet-300 mt-1 w-full transition-colors"
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

        {/* ── Actions ── */}
        <div
          class="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleLike(p.uuid)}
            class="flex items-center gap-1 text-xs transition-colors"
            classList={{
              "text-rose-500": p.viewerLiked,
              "text-gray-400 hover:text-rose-400": !p.viewerLiked,
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
            onClick={() => handleRepeat(p.mid)}
            class="flex items-center gap-1 text-xs transition-colors"
            classList={{
              "text-emerald-500": p.viewerRepeated,
              "text-gray-400 hover:text-emerald-400": !p.viewerRepeated,
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

          <Show when={replyCount > 0}>
            <span class="ml-auto text-xs text-gray-400">
              {replyCount} {replyCount === 1 ? t("ui.reply") : t("ui.replies")}
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

// ── MasonryView ───────────────────────────────────────────────────────────────

export default function MasonryView(props: { posts: ThreadNode[] }) {
  const colCount = useColumnCount();
  const columns = createMemo(() => splitIntoColumns(props.posts, colCount()));

  return (
    <Show
      when={props.posts.length > 0}
      fallback={
        <p class="text-center py-16 text-gray-400 text-sm">Nothing here yet.</p>
      }
    >
      <div class="flex gap-3 items-start">
        <For each={columns()}>
          {(col) => (
            <div class="flex-1 flex flex-col min-w-0">
              <For each={col}>{(post) => <MasonryCard post={post} />}</For>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}

// ── MasonryPlaceholder ────────────────────────────────────────────────────────

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
                <div
                  class="mb-3 bg-surface
                            border border-gray-100 dark:border-gray-700/50
                            rounded-xl p-4 shadow-sm animate-pulse"
                >
                  <div class="flex items-center gap-2 mb-3">
                    <div class="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 shrink-0" />
                    <div class="flex flex-col gap-1.5 min-w-0">
                      <div class="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded w-24" />
                      <div class="h-2 bg-zinc-200 dark:bg-zinc-700 rounded w-16" />
                    </div>
                  </div>
                  <div
                    class={`${heights[i % heights.length]} bg-zinc-200 dark:bg-zinc-700 rounded-lg`}
                  />
                  <div class="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <div class="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded w-6" />
                    <div class="h-2.5 bg-zinc-200 dark:bg-zinc-700 rounded w-6" />
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
