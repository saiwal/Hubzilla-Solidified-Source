import { createSignal } from "solid-js";
import type { ThreadNode } from "../core/utils/thread";
import CommentThread from "./CommentThread";
import { handleLike, handleDislike, handleRepeat, handleComment } from "../modules/network/store";
import { BiRegularLike, BiRegularDislike, BiRegularShareAlt, BiRegularChat, BiRegularSend, BiRegularChevronDown, BiRegularChevronUp } from "solid-icons/bi";

export default function PostCard(props: { post: ThreadNode }) {

  const [replyOpen, setReplyOpen] = createSignal(false);
  const [showComments, setShowComments] = createSignal(false);
  const [replyBody, setReplyBody] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [actionError, setActionError] = createSignal<string | null>(null);

  async function onLike() {
    setActionError(null);
    try { await handleLike(props.post.mid, props.post.iid!); }
    catch { setActionError("Like failed"); }
  }

  async function onDislike() {
    setActionError(null);
    try { await handleDislike(props.post.mid, props.post.iid!); }
    catch { setActionError("Dislike failed"); }
  }

  async function onRepeat() {
    setActionError(null);
    try { await handleRepeat(props.post.mid, props.post.iid!); }
    catch { setActionError("Repeat failed"); }
  }

  async function submitComment() {
    const body = replyBody().trim();
    if (!body) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await handleComment(props.post.mid, props.post.iid!, body, props.post.authorName, props.post.authorAvatar);
      setReplyBody("");
      setReplyOpen(false);
      setShowComments(true);
    } catch {
      setActionError("Comment failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 mb-4 shadow-sm hover:shadow-md transition-shadow duration-200">

      {/* Header */}
      <div class="flex items-start gap-3">
        <img
          src={props.post.authorAvatar}
          width="44"
          height="44"
          class="rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700"
        />
        <div class="flex flex-col">
          <span class="font-semibold text-zinc-900 dark:text-zinc-100">{props.post.authorName}</span>
          <span class="text-sm text-zinc-500 dark:text-zinc-400">
            {new Date(props.post.created).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div
        class="mt-4 text-zinc-800 dark:text-zinc-200 leading-relaxed prose prose-zinc dark:prose-invert max-w-none"
        innerHTML={props.post.body}
      />

      {/* Error */}
      {actionError() && (
        <p class="mt-2 text-xs text-red-500">{actionError()}</p>
      )}

      {/* Action bar */}
      <div class="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-1 flex-wrap">

        <ActionBtn
          icon={<BiRegularLike size={17} />}
          count={props.post.likeCount}
          label="Like"
          onClick={onLike}
          active={props.post.viewerLiked}
          activeClass="text-blue-500"
        />

        <ActionBtn
          icon={<BiRegularDislike size={17} />}
          count={props.post.dislikeCount}
          label="Dislike"
          onClick={onDislike}
          active={props.post.viewerDisliked}
          activeClass="text-red-500"
        />

        <ActionBtn
          icon={<BiRegularShareAlt size={17} />}
          count={props.post.repeatCount}
          label="Repeat"
          onClick={onRepeat}
          active={props.post.viewerRepeated}
          activeClass="text-green-500"
        />

        {/* Comments toggle */}
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
            {showComments() ? <BiRegularChevronUp size={17} /> : <BiRegularChevronDown size={17} />}
            <span>{props.post.children.length} comment{props.post.children.length !== 1 ? "s" : ""}</span>
          </button>
        )}

        {/* Reply button */}
        <button
          onClick={() => { setReplyOpen((v) => !v); setShowComments(true); }}
          class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                 text-zinc-500 dark:text-zinc-400
                 hover:bg-zinc-100 dark:hover:bg-zinc-800
                 hover:text-zinc-800 dark:hover:text-zinc-100
                 transition-colors"
          title="Reply"
        >
          <BiRegularChat size={17} />
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
              onClick={() => { setReplyOpen(false); setReplyBody(""); }}
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
              <BiRegularSend size={15} />
              {submitting() ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {/* Nested comments */}
      <CommentThread comments={props.post.children} show={showComments()} />
    </div>
  );
}

// ─── Tiny reusable action button ────────────────────────────────────────────
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
              ${props.active
                ? props.activeClass
                : "text-zinc-500 dark:text-zinc-400"
              }`}
    >
      {props.icon}
      <span>{props.count}</span>
    </button>
  );
}
