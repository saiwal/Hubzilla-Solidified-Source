// src/shared/stream/components/PostCard.tsx
import { createSignal, onMount, onCleanup, Show } from "solid-js";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "../types";
import CommentThread from "@/shared/views/CommentThread";
import formatPostDate from "@/shared/lib/date";
import { markItemSeen } from "@/shared/lib/markSeen";
import {
  MdFillBar_chart,
  MdFillChat,
  MdFillKeyboard_arrow_down,
  MdFillKeyboard_arrow_up,
  MdFillShare,
  MdFillFormat_list_bulleted,
  MdFillAccount_tree,
  MdOutlineThumb_down,
  MdOutlineThumb_up,
} from "solid-icons/md";
import { useI18n } from "@/i18n";
import { BiRegularLinkExternal } from "solid-icons/bi";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import DOMPurify from "dompurify";

export type { StreamHandlers as PostActions };

/** Recursively flatten a thread tree into a chronological list.
 *  Each node's children are zeroed out so CommentThread won't re-nest them. */
function flattenThread(nodes: ThreadNode[]): ThreadNode[] {
  const result: ThreadNode[] = [];
  for (const node of nodes) {
    result.push({ ...node, children: [] });
    result.push(...flattenThread(node.children));
  }
  return result;
}
function hasNestedComments(nodes: ThreadNode[]): boolean {
  return nodes.some(n => n.children.length > 0);
}
export default function PostCard(props: {
  post: ThreadNode;
  handlers: StreamHandlers;
  onSeen?: (uuid: string) => void;
  compact?: boolean;
}) {
  const [replyOpen, setReplyOpen] = createSignal(false);
  const [showComments, setShowComments] = createSignal(false);
  const [threaded, setThreaded] = createSignal(true);
  const { locale } = useI18n();
  let cardRef!: HTMLDivElement;

  onMount(() => {
    const uuid = props.post.uuid;
    if (!uuid) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect();
          markItemSeen(uuid);
          props.onSeen?.(uuid);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(cardRef);
    onCleanup(() => observer.disconnect());
  });

  function onLike() { props.handlers.onLike(props.post.mid); }
  function onDislike() { props.handlers.onDislike(props.post.mid); }
  function onRepeat() { props.handlers.onRepeat(props.post.mid); }

  const visibleComments = () =>
    threaded() ? props.post.children : flattenThread(props.post.children);

  // ── Compact (comment) layout ──────────────────────────────────────────────
  if (props.compact) {
    return (
      <div ref={cardRef} class="rounded-tl-lg rounded-bl-lg pl-3 py-2.5 mb-1 border border-rim">
        {/* Single-line author header */}
        <div class="flex items-center gap-2 min-w-0">
          <Show
            when={props.post.authorAvatar}
            fallback={
              <div class="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent-txt
                          shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
                {props.post.authorName?.[0]?.toUpperCase() ?? "?"}
              </div>
            }
          >
            <img
              src={props.post.authorAvatar}
              width="24"
              height="24"
              class="rounded-full object-cover shrink-0"
            />
          </Show>
          <a
            href={props.post.authorUrl}
            class="font-medium text-sm text-txt hover:underline truncate"
          >
            {props.post.authorName}
          </a>
          <Show when={props.post.verb && props.post.verb !== "Create"}>
            <span class="text-xs text-subtle italic shrink-0">
              {props.post.verb?.toLowerCase()}
            </span>
          </Show>
          <span
            class="text-xs text-subtle shrink-0 ml-1"
            title={new Date(props.post.created + "Z").toLocaleString(locale())}
          >
            {formatPostDate(props.post.created, locale())}
          </span>
          <a
            href={props.post.permalink}
            class="ml-auto pr-2 text-subtle hover:text-txt transition-colors shrink-0"
            title="source"
          >
            <BiRegularLinkExternal size={13} />
          </a>
        </div>

        {/* Body — no title rendered for comments */}
        <div
          class="mt-1.5 prose prose-sm dark:prose-invert max-w-none text-muted
                 prose-a:text-accent prose-a:no-underline hover:prose-a:underline
                 prose-blockquote:not-italic prose-blockquote:border-accent
                 prose-code:bg-overlay prose-code:px-1 prose-code:rounded prose-code:text-xs prose-code:text-txt
                 prose-img:rounded-lg prose-img:my-1 break-words
                 prose-p:my-1 prose-p:leading-snug"
          innerHTML={props.post.body}
        />

        {/* Compact action bar */}
        <div class="mt-2 flex items-center gap-0.5 flex-wrap">
          <CompactActionBtn
            icon={<MdOutlineThumb_up size={14} />}
            count={props.post.likeCount}
            label="Like"
            onClick={onLike}
            active={props.post.viewerLiked}
          />
          <CompactActionBtn
            icon={<MdOutlineThumb_down size={14} />}
            count={props.post.dislikeCount}
            label="Dislike"
            onClick={onDislike}
            active={props.post.viewerDisliked}
          />
          <CompactActionBtn
            icon={<MdFillShare size={14} />}
            count={props.post.repeatCount}
            label="Repeat"
            onClick={onRepeat}
            active={props.post.viewerRepeated}
          />

          <Show when={props.post.children.length > 0}>
            <button
              onClick={() => setShowComments((v) => !v)}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     text-subtle hover:bg-overlay hover:text-txt transition-colors"
            >
              <Show
                when={showComments()}
                fallback={<MdFillKeyboard_arrow_down size={14} />}
              >
                <MdFillKeyboard_arrow_up size={14} />
              </Show>
              <span>{props.post.children.length}</span>
            </button>
          </Show>

          {/* Thread/flat toggle — compact */}
<Show when={hasNestedComments(props.post.children)}>
            <button
              onClick={() => setThreaded((v) => !v)}
              class="flex items-center gap-1 px-2 py-1 rounded-md text-xs
                     text-subtle hover:bg-overlay hover:text-txt transition-colors"
              title={threaded() ? "Switch to flat view" : "Switch to threaded view"}
            >
              <Show when={threaded()} fallback={<MdFillAccount_tree size={14} />}>
                <MdFillFormat_list_bulleted size={14} />
              </Show>
            </button>
          </Show>

          <button
            onClick={() => { setReplyOpen((v) => !v); setShowComments(true); }}
            class="ml-auto flex items-center gap-1 px-2 py-1 rounded-md text-xs
                   text-subtle hover:bg-overlay hover:text-txt transition-colors"
          >
            <MdFillChat size={14} />
            <span>Reply</span>
          </button>
        </div>

        <Show when={replyOpen() && props.post.iid && props.post.profileUid}>
          <CommentComposer
            parentMid={props.post.mid}
            parentIid={props.post.iid!}
            profileUid={props.post.profileUid!}
            onSubmitted={(body) => {
              props.handlers.onComment(
                props.post.mid, body,
                props.post.authorName, props.post.authorAvatar,
              );
              setReplyOpen(false);
              setShowComments(true);
            }}
          />
        </Show>
        <CommentThread
          comments={visibleComments()}
          show={showComments()}
          handlers={props.handlers}
        />
      </div>
    );
  }

  // ── Full (main post) layout ───────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      class="bg-surface border border-rim rounded-2xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Header */}
      <div class="flex items-start gap-3">
        <Show
          when={props.post.authorAvatar}
          fallback={
            <div class="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent-txt
                        shrink-0 flex items-center justify-center text-white text-sm font-bold ring-1 ring-rim">
              {props.post.authorName?.[0]?.toUpperCase() ?? "?"}
            </div>
          }
        >
          <img
            src={props.post.authorAvatar}
            width="44"
            height="44"
            class="rounded-full object-cover ring-1 ring-rim"
          />
        </Show>
        <div class="flex flex-col">
          <a
            href={props.post.authorUrl}
            class="font-semibold text-txt hover:underline"
          >
            {props.post.authorName}
          </a>
          <div class="flex items-baseline gap-1.5">
            <span
              class="text-sm text-muted"
              title={new Date(props.post.created + "Z").toLocaleString(locale())}
            >
              {formatPostDate(props.post.created, locale())}
            </span>
            <Show when={props.post.verb && props.post.verb !== "Create"}>
              <span class="text-xs text-subtle italic">
                {props.post.verb?.toLowerCase()}
              </span>
            </Show>
          </div>
        </div>

        <a
          href={props.post.permalink}
          class="ml-auto text-sm text-muted hover:text-txt transition-colors"
          title="source"
        >
          <BiRegularLinkExternal size={17} />
        </a>
      </div>

      {/* Title */}
      <Show when={props.post.title}>
        <div
          class="mt-6 prose prose-sm dark:prose-invert max-w-none
                 [&>*]:font-bold [&>*]:tracking-tight [&>*]:text-lg [&>*]:text-txt"
          innerHTML={DOMPurify.sanitize(props.post.title!)}
        />
      </Show>

      {/* Body */}
      <div
        class="mt-4 prose-code:break-all prose prose-sm dark:prose-invert max-w-none
               prose-a:text-accent prose-a:no-underline hover:prose-a:underline
               prose-blockquote:not-italic prose-blockquote:border-accent
               prose-code:bg-overlay prose-code:px-1 prose-code:rounded prose-code:text-sm prose-code:text-txt
               prose-img:rounded-lg prose-img:my-2 break-words text-muted
               [&_.bb-share]:mt-3 [&_.bb-share]:rounded-xl [&_.bb-share]:border [&_.bb-share]:border-rim
               [&_.bb-share]:bg-overlay [&_.bb-share]:overflow-hidden [&_.bb-share_br]:hidden
               [&_.bb-share-header]:flex [&_.bb-share-header]:items-center
               [&_.bb-share-header]:gap-2 [&_.bb-share-header]:px-3 [&_.bb-share-header]:py-2
               [&_.bb-share-header]:text-xs [&_.bb-share-header]:text-muted
               [&_.bb-share-header]:border-b [&_.bb-share-header]:border-rim
               [&_.share-avatar]:!w-6 [&_.share-avatar]:!h-6 [&_.share-avatar]:rounded-full
               [&_.share-avatar]:object-cover [&_.share-avatar]:shrink-0 [&_.share-avatar]:!my-0
               [&_.bb-share-header_a]:font-medium [&_.bb-share-header_a]:text-txt [&_.bb-share-header_a:hover]:underline
               [&_.bb-share-content]:block [&_.bb-share-content]:px-3 [&_.bb-share-content]:py-2.5
               [&_.bb-share-content]:text-sm [&_.bb-share-content]:text-muted
               [&_.bb-share-content]:!border-l-0 [&_.bb-share-content]:!pl-0
               [&_.bb-share-content]:!not-italic [&_.bb-share-content]:!text-inherit"
        innerHTML={props.post.body}
      />

      {/* Action bar */}
      <div class="mt-4 pt-3 border-t border-rim flex items-center gap-1 flex-wrap">
        <ActionBtn
          icon={<MdOutlineThumb_up size={17} />}
          count={props.post.likeCount}
          label="Like"
          onClick={onLike}
          active={props.post.viewerLiked}
          activeClass="text-accent"
        />
        <ActionBtn
          icon={<MdOutlineThumb_down size={17} />}
          count={props.post.dislikeCount}
          label="Dislike"
          onClick={onDislike}
          active={props.post.viewerDisliked}
          activeClass="text-accent"
        />
        <ActionBtn
          icon={<MdFillShare size={17} />}
          count={props.post.repeatCount}
          label="Repeat"
          onClick={onRepeat}
          active={props.post.viewerRepeated}
          activeClass="text-accent"
        />

        <Show
          when={
            props.post.likeCount > 0 ||
            props.post.dislikeCount > 0 ||
            props.post.repeatCount > 0
          }
        >
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title="Post Statistics"
          >
            <MdFillBar_chart size={17} />
          </button>
        </Show>

        <Show when={props.post.children.length > 0}>
          <button
            onClick={() => setShowComments((v) => !v)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title="Toggle comments"
          >
            <Show
              when={showComments()}
              fallback={<MdFillKeyboard_arrow_down size={17} />}
            >
              <MdFillKeyboard_arrow_up size={17} />
            </Show>
            <span>
              {props.post.children.length} comment
              {props.post.children.length !== 1 ? "s" : ""}
            </span>
          </button>
        </Show>

        {/* Thread/flat toggle — full */}
<Show when={hasNestedComments(props.post.children)}>
          <button
            onClick={() => setThreaded((v) => !v)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-muted hover:bg-overlay hover:text-txt transition-colors"
            title={threaded() ? "Switch to flat view" : "Switch to threaded view"}
          >
            <Show when={threaded()} fallback={<MdFillAccount_tree size={17} />}>
              <MdFillFormat_list_bulleted size={17} />
            </Show>
            <span>{threaded() ? "Flat" : "Threaded"}</span>
          </button>
        </Show>

        <button
          onClick={() => { setReplyOpen((v) => !v); setShowComments(true); }}
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                 text-muted hover:bg-overlay hover:text-txt transition-colors"
          title="Reply"
        >
          <MdFillChat size={17} />
          <span>Reply</span>
        </button>
      </div>

      <Show when={replyOpen() && props.post.iid && props.post.profileUid}>
        <CommentComposer
          parentMid={props.post.mid}
          parentIid={props.post.iid!}
          profileUid={props.post.profileUid!}
          onSubmitted={(body) => {
            props.handlers.onComment(
              props.post.mid, body,
              props.post.authorName, props.post.authorAvatar,
            );
            setReplyOpen(false);
            setShowComments(true);
          }}
        />
      </Show>
      <CommentThread
        comments={visibleComments()}
        show={showComments()}
        handlers={props.handlers}
      />
    </div>
  );
}

function ActionBtn(props: {
  icon: any;
  count: number;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeClass: string;
}) {
  return (
    <button
      onClick={props.onClick}
      title={props.label}
      class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors select-none hover:bg-overlay
              ${props.active ? props.activeClass : "text-muted"}`}
    >
      {props.icon}
      <span>{props.count}</span>
    </button>
  );
}

function CompactActionBtn(props: {
  icon: any;
  count: number;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={props.onClick}
      title={props.label}
      class={`flex items-center gap-1 px-2 py-1 rounded-md text-xs
              transition-colors select-none hover:bg-overlay
              ${props.active ? "text-accent" : "text-subtle"}`}
    >
      {props.icon}
      <span>{props.count}</span>
    </button>
  );
}
