import { createSignal, onMount, onCleanup } from "solid-js";
import type { ThreadNode } from "../lib/thread";
import CommentThread from "./CommentThread";
import formatPostDate from "../lib/date";
import {
  handleLike as networkLike,
  handleDislike as networkDislike,
  handleRepeat as networkRepeat,
  handleComment as networkComment,
} from "@/modules/network/store/store";
import { markItemSeen } from "@/shared/lib/markSeen";
import {
  MdFillBar_chart,
  MdFillChat,
  MdFillKeyboard_arrow_down,
  MdFillKeyboard_arrow_up,
  MdFillSend,
  MdFillShare,
  MdOutlineThumb_down,
  MdOutlineThumb_up,
} from "solid-icons/md";
import { useI18n } from "@/i18n";
import { BiRegularLinkExternal } from "solid-icons/bi";

export interface PostActions {
  onLike: (uuid: string) => Promise<void>;
  onDislike: (uuid: string) => Promise<void>;
  onRepeat: (uuid: string) => Promise<void>;
  onComment: (
    parentUuid: string,
    body: string,
    authorName: string,
    authorAvatar: string,
  ) => Promise<void>;
}
const networkActions: PostActions = {
  onLike: networkLike,
  onDislike: networkDislike,
  onRepeat: networkRepeat,
  onComment: networkComment,
};

export default function PostCard(props: {
  post: ThreadNode;
  actions?: PostActions;
  onSeen?: (uuid: string) => void;
}) {
  const getActions = () => props.actions ?? networkActions;
  const [replyOpen, setReplyOpen] = createSignal(false);
  const [showComments, setShowComments] = createSignal(false);
  const [replyBody, setReplyBody] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);
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

  async function onLike() {
    setActionError(null);
    try {
      await getActions().onLike(props.post.uuid);
    } catch {
      setActionError("Like failed");
    }
  }

  async function onDislike() {
    setActionError(null);
    try {
      await getActions().onDislike(props.post.uuid);
    } catch {
      setActionError("Dislike failed");
    }
  }

  async function onRepeat() {
    setActionError(null);
    try {
      await getActions().onRepeat(props.post.uuid);
    } catch {
      setActionError("Repeat failed");
    }
  }

  async function submitComment() {
    const body = replyBody().trim();
    if (!body) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await getActions().onComment(
        props.post.uuid,
        body,
        props.post.authorName,
        props.post.authorAvatar,
      );
      setReplyBody("");
      setReplyOpen(false);
      setShowComments(true);
    } catch {
      setActionError("Comment failed please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      ref={cardRef}
      class="bg-surface border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Header */}
      <div class="flex items-start gap-3">
        <img
          src={props.post.authorAvatar}
          width="44"
          height="44"
          class="rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
        />
        <div class="flex flex-col">
          <a
            href={props.post.authorUrl}
            class="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
          >
            {props.post.authorName}
          </a>
          <span
            class="text-sm text-zinc-500 dark:text-zinc-400"
            title={new Date(props.post.created + "Z").toLocaleString(locale())}
          >
            {formatPostDate(props.post.created, locale())}
          </span>
        </div>
        <a
          href={props.post.permalink}
          class="ml-auto text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" title="source"
        >
          <BiRegularLinkExternal size={17} />
        </a>
      </div>

      {/* Title */}
      <div
        class="mt-6 prose prose-zinc dark:prose-invert max-w-none
         [&>*]:font-bold [&>*]:tracking-tight [&>*]:text-lg"
        innerHTML={props.post.title}
      />

      {/* Body */}
      <div
        class="mt-4 prose-code:break-all prose prose-sm prose-zinc dark:prose-invert max-w-none
         prose-a:text-blue-500 prose-a:no-underline hover:prose-a:underline
         prose-blockquote:not-italic prose-blockquote:border-zinc-300
         prose-code:bg-zinc-100 dark:prose-code:bg-zinc-700
         prose-code:px-1 prose-code:rounded prose-code:text-sm
         prose-img:rounded-lg prose-img:my-2
         break-words
         [&_.bb-share]:mt-3 [&_.bb-share]:rounded-xl [&_.bb-share]:border
         [&_.bb-share]:border-zinc-200 [&_.bb-share]:dark:border-zinc-700
         [&_.bb-share]:bg-zinc-50 [&_.bb-share]:dark:bg-zinc-800/60
         [&_.bb-share]:overflow-hidden
         [&_.bb-share_br]:hidden
         [&_.bb-share-header]:flex [&_.bb-share-header]:items-center
         [&_.bb-share-header]:gap-2 [&_.bb-share-header]:px-3 [&_.bb-share-header]:py-2
         [&_.bb-share-header]:text-xs [&_.bb-share-header]:text-zinc-500
         [&_.bb-share-header]:dark:text-zinc-400
         [&_.bb-share-header]:border-b [&_.bb-share-header]:border-zinc-200
         [&_.bb-share-header]:dark:border-zinc-700
         [&_.share-avatar]:!w-6 [&_.share-avatar]:!h-6 [&_.share-avatar]:rounded-full
         [&_.share-avatar]:object-cover [&_.share-avatar]:shrink-0 [&_.share-avatar]:!my-0
         [&_.bb-share-header_a]:font-medium [&_.bb-share-header_a]:text-zinc-700
         [&_.bb-share-header_a]:dark:text-zinc-300 [&_.bb-share-header_a:hover]:underline
         [&_.bb-share-content]:block [&_.bb-share-content]:px-3 [&_.bb-share-content]:py-2.5
         [&_.bb-share-content]:text-sm [&_.bb-share-content]:text-zinc-700
         [&_.bb-share-content]:dark:text-zinc-300
         [&_.bb-share-content]:!border-l-0 [&_.bb-share-content]:!pl-0
         [&_.bb-share-content]:!not-italic [&_.bb-share-content]:!text-inherit"
        innerHTML={props.post.body}
      />

      {/* Error */}
      {actionError() && (
        <p class="mt-2 text-xs text-red-500">{actionError()}</p>
      )}

      {/* Action bar */}
      <div class="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1 flex-wrap">
        <ActionBtn
          icon={<MdOutlineThumb_up size={17} />}
          count={props.post.likeCount}
          label="Like"
          onClick={onLike}
          active={props.post.viewerLiked}
          activeClass="text-blue-500"
        />
        <ActionBtn
          icon={<MdOutlineThumb_down size={17} />}
          count={props.post.dislikeCount}
          label="Dislike"
          onClick={onDislike}
          active={props.post.viewerDisliked}
          activeClass="text-red-500"
        />
        <ActionBtn
          icon={<MdFillShare size={17} />}
          count={props.post.repeatCount}
          label="Repeat"
          onClick={onRepeat}
          active={props.post.viewerRepeated}
          activeClass="text-green-500"
        />

        {(props.post.likeCount > 0 ||
          props.post.dislikeCount > 0 ||
          props.post.repeatCount > 0) && (
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-zinc-500 dark:text-zinc-400
                   hover:bg-zinc-100 dark:hover:bg-zinc-800
                   hover:text-zinc-800 dark:hover:text-zinc-100
                   transition-colors"
            title="Post Statistics"
          >
            <MdFillBar_chart size={17} />
          </button>
        )}

        {props.post.children.length > 0 && (
          <button
            onClick={() => setShowComments((v) => !v)}
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                   text-zinc-500 dark:text-zinc-400
                   hover:bg-zinc-100 dark:hover:bg-zinc-800
                   hover:text-zinc-800 dark:hover:text-zinc-100
                   transition-colors"
            title="Toggle comments"
          >
            {showComments() ? (
              <MdFillKeyboard_arrow_up size={17} />
            ) : (
              <MdFillKeyboard_arrow_down size={17} />
            )}
            <span>
              {props.post.children.length} comment
              {props.post.children.length !== 1 ? "s" : ""}
            </span>
          </button>
        )}

        <button
          onClick={() => {
            setReplyOpen((v) => !v);
            setShowComments(true);
          }}
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                 text-zinc-500 dark:text-zinc-400
                 hover:bg-zinc-100 dark:hover:bg-zinc-800
                 hover:text-zinc-800 dark:hover:text-zinc-100
                 transition-colors"
          title="Reply"
        >
          <MdFillChat size={17} />
          <span>Reply</span>
        </button>
      </div>

      {/* Inline reply composer */}
      {replyOpen() && (
        <div class="mt-3 flex flex-col gap-2">
          <textarea
            value={replyBody()}
            onInput={(e) => setReplyBody(e.currentTarget.value)}
            placeholder="Write a reply…"
            rows={3}
            class="w-full rounded-xl border border-zinc-300 dark:border-zinc-700
                   bg-zinc-50 dark:bg-zinc-800
                   text-zinc-900 dark:text-zinc-100
                   text-sm px-3 py-2 resize-none
                   focus:outline-none focus:ring-2 focus:ring-blue-500
                   placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          <div class="flex justify-end gap-2">
            <button
              onClick={() => {
                setReplyOpen(false);
                setReplyBody("");
              }}
              class="px-3 py-1.5 text-sm rounded-lg
                     text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800
                     transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submitComment}
              disabled={submitting() || !replyBody().trim()}
              class="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg
                     bg-blue-500 hover:bg-blue-600 active:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     text-white transition-colors"
            >
              <MdFillSend size={15} />
              {submitting() ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      <CommentThread comments={props.post.children} show={showComments()} />
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
              transition-colors select-none
              hover:bg-zinc-100 dark:hover:bg-zinc-800
              ${props.active ? props.activeClass : "text-zinc-500 dark:text-zinc-400"}`}
    >
      {props.icon}
      <span>{props.count}</span>
    </button>
  );
}
