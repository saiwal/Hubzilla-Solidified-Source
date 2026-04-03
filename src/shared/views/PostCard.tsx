import { createSignal } from "solid-js";
import type { ThreadNode } from "../lib/thread";
import CommentThread from "./CommentThread";
import formatPostDate from "../lib/date";
import {
  handleLike as networkLike,
  handleDislike as networkDislike,
  handleRepeat as networkRepeat,
  handleComment as networkComment,
} from "@/modules/network/store/store";
import {
  MdFillChat,
  MdFillKeyboard_arrow_down,
  MdFillKeyboard_arrow_up,
  MdFillSend,
  MdFillShare,
  MdOutlineThumb_down,
  MdOutlineThumb_up,
} from "solid-icons/md";
import { BiRegularPieChartAlt2 } from "solid-icons/bi";

export interface PostActions {
  onLike: (mid: string, iid: number) => Promise<void>;
  onDislike: (mid: string, iid: number) => Promise<void>;
  onRepeat: (mid: string, iid: number) => Promise<void>;
  onComment: (
    parentMid: string,
    parentIid: number,
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
}) {
  const getActions = () => props.actions ?? networkActions;
  const [replyOpen, setReplyOpen] = createSignal(false);
  const [showComments, setShowComments] = createSignal(false);
  const [replyBody, setReplyBody] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);

  async function onLike() {
    setActionError(null);
    try {
      await getActions().onLike(props.post.mid, props.post.iid!);
    } catch {
      setActionError("Like failed");
    }
  }

  async function onDislike() {
    setActionError(null);
    try {
      await getActions().onDislike(props.post.mid, props.post.iid!);
    } catch {
      setActionError("Dislike failed");
    }
  }

  async function onRepeat() {
    setActionError(null);
    try {
      await getActions().onRepeat(props.post.mid, props.post.iid!);
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
        props.post.mid,
        props.post.iid!,
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
    <div class="bg-white dark:bg-gray-800  border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">
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
          <span class="text-sm text-zinc-500 dark:text-zinc-400">
  {formatPostDate(props.post.created)}
          </span>
        </div>
      </div>
      {/* Title */}
      <div
        class="mt-6 text-md md:text-lg font-bold tracking-tight text-zinc-900 dark:text-white leading-tight"
        innerHTML={props.post.title}
      />

      {/* Body */}
      <div
        class="mt-4 text-zinc-800 dark:text-zinc-200 leading-relaxed prose prose-zinc dark:prose-invert max-w-none break-all"
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
            <BiRegularPieChartAlt2 size={17}/>
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

// ─── Tiny reusable action button ─────────────────────────────────────────────
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
