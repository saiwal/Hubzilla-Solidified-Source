import { A } from "@solidjs/router";
import { createSignal, Show, For } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import {
  detail,
  handleLike,
  handleDislike,
  handleComment,
} from "../store/store";
import { MdFillChat, MdFillChevron_left, MdFillChevron_right, MdFillSend, MdOutlineThumb_down, MdOutlineThumb_up } from "solid-icons/md";


export default function ImageView(props: { profileUid: number }) {
  const navigate = useNavigate();
  const params = useParams<{ nick?: string }>();
  const d = detail;
  const [reply, setReply] = createSignal("");
  const [showReply, setShowReply] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);

  async function submitComment() {
    const body = reply().trim();
    if (!body) return;
    setSubmitting(true);
    try {
      await handleComment(body, props.profileUid);
      setReply("");
      setShowReply(false);
    } finally {
      setSubmitting(false);
    }
  }

  // Strip origin from prevlink/nextlink so <a href> works as a SPA path
  const prevPath = () =>
    d()?.prevlink?.replace(window.location.origin, "") ?? null;
  const nextPath = () =>
    d()?.nextlink?.replace(window.location.origin, "") ?? null;

  return (
    <div class="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div class="flex items-center gap-2">
        <button
          onClick={() => navigate(`/photos/${params.nick ?? ""}`)}
          class="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
        >
          <MdFillChevron_left size={16} />
          Back
        </button>
        <Show when={d()?.album}>
          <span class="text-zinc-300 dark:text-zinc-600">/</span>
          <span class="text-sm text-zinc-500 dark:text-zinc-400">
            {d()?.album}
          </span>
        </Show>
      </div>

      {/* Image */}
      <div class="relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center min-h-48">
        <img
          src={d()?.src_full ?? d()?.src}
          alt={d()?.filename}
          class="max-h-[70vh] w-full object-contain"
        />

        <Show when={prevPath()}>
          <A
            href={prevPath()!}
            class="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full
                   bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <MdFillChevron_left size={22} />
          </A>
        </Show>
        <Show when={nextPath()}>
          <A
            href={nextPath()!}
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full
                   bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <MdFillChevron_right size={22} />
          </A>
        </Show>
      </div>

      {/* Meta + actions */}
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <Show when={d()?.description}>
          <p class="text-zinc-800 dark:text-zinc-200 mb-3">
            {d()?.description}
          </p>
        </Show>
        <p class="text-xs text-zinc-400 mb-4">
          {d()?.created ? new Date(d()!.created).toLocaleString() : ""}
        </p>

        <div class="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <button
            onClick={handleLike}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    hover:bg-zinc-100 dark:hover:bg-zinc-800
                    ${d()?.viewer_liked ? "text-blue-500" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            <MdOutlineThumb_up size={17} />
            <span>{d()?.like_count ?? 0}</span>
          </button>

          <button
            onClick={handleDislike}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    hover:bg-zinc-100 dark:hover:bg-zinc-800
                    ${d()?.viewer_disliked ? "text-red-500" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            <MdOutlineThumb_down size={17} />
            <span>{d()?.dislike_count ?? 0}</span>
          </button>

          <Show when={d()?.item_id}>
            <button
              onClick={() => setShowReply((v) => !v)}
              class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                     text-zinc-500 dark:text-zinc-400
                     hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <MdFillChat size={17} />
              <span>Comment</span>
            </button>
          </Show>
        </div>

        <Show when={showReply()}>
          <div class="mt-3 flex flex-col gap-2">
            <textarea
              value={reply()}
              onInput={(e) => setReply(e.currentTarget.value)}
              placeholder="Write a comment…"
              rows={3}
              class="w-full rounded-xl border border-zinc-300 dark:border-zinc-700
                     bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100
                     text-sm px-3 py-2 resize-none
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     placeholder:text-zinc-400"
            />
            <div class="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowReply(false);
                  setReply("");
                }}
                class="px-3 py-1.5 text-sm rounded-lg text-zinc-500
                       hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                disabled={submitting() || !reply().trim()}
                class="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg
                       bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white transition-colors"
              >
                <MdFillSend size={15} />
                {submitting() ? "Sending…" : "Send"}
              </button>
            </div>
          </div>
        </Show>
      </div>

      {/* Comments */}
      <Show when={(d()?.comments?.length ?? 0) > 0}>
        <div class="flex flex-col gap-3">
          <h3 class="text-sm font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
            Comments
          </h3>
          <For each={d()?.comments}>
            {(comment) => (
              <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex gap-3">
                <Show when={comment.author.photo}>
                  <img
                    src={comment.author.photo}
                    alt={comment.author.name}
                    class="w-8 h-8 rounded-full object-cover ring-1 ring-zinc-200 dark:ring-zinc-700 shrink-0"
                  />
                </Show>
                <div class="flex flex-col gap-1 min-w-0">
                  <div class="flex items-baseline gap-2">
                    <span class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {comment.author.name || "Anonymous"}
                    </span>
                    <span class="text-xs text-zinc-400">
                      {new Date(comment.created).toLocaleString()}
                    </span>
                  </div>
                  <p class="text-sm text-zinc-700 dark:text-zinc-300 break-words">
                    {comment.body}
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
