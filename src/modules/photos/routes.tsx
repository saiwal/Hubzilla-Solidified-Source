import { onMount, createSignal, Show, For } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import {
  photos, albumName, detail, loading,
  loadSummary, loadAlbum, loadImage,
  handleLike, handleDislike, handleComment,
} from "./store";
import { BiRegularLike, BiRegularDislike, BiRegularChat, BiRegularSend, BiRegularChevronLeft, BiRegularChevronRight } from "solid-icons/bi";

// ─── Top-level router ────────────────────────────────────────────────────────
// Handles three URL shapes via optional params:
//   /photos              → summary
//   /photos/album/:hash  → album
//   /photos/image/:id    → image detail

export default function Photos() {
  const params = useParams<{ datatype?: string; datum?: string; nick?: string }>();

  onMount(() => {
    const nick     = params.nick ?? '';
    const datatype = params.datatype ?? 'summary';
    const datum    = params.datum ?? '';

    if (datatype === 'album' && datum) loadAlbum(nick, datum);
    else if (datatype === 'image' && datum) loadImage(nick, datum);
    else loadSummary(nick);
  });

  return (
    <div class="max-w-5xl mx-auto">
      <Show when={loading()}>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">Loading…</p>
      </Show>

      <Show when={!loading() && detail()}>
        <ImageView profileUid={0} />
      </Show>

      <Show when={!loading() && !detail()}>
        <PhotoGrid />
      </Show>
    </div>
  );
}

// ─── Photo grid (summary + album) ────────────────────────────────────────────

function PhotoGrid() {
  const navigate = useNavigate();
  const params   = useParams<{ nick?: string }>();

  return (
    <>
      <Show when={albumName()}>
        <div class="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(params.nick ? `/photos/${params.nick}` : '/photos')}
            class="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
          >
            <BiRegularChevronLeft size={16} />
            All photos
          </button>
          <span class="text-zinc-300 dark:text-zinc-600">/</span>
          <span class="text-sm font-medium text-zinc-800 dark:text-zinc-200">{albumName()}</span>
        </div>
      </Show>

      <Show when={!loading() && photos().length === 0}>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">No photos yet.</p>
      </Show>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <For each={photos()}>
          {(photo) => {
            const href = params.nick
              ? `/photos/${params.nick}/image/${photo.resource_id}`
              : `/photos/image/${photo.resource_id}`;
            return (
              <a
                href={href}
                class="group relative aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 block"
              >
                <img
                  src={photo.src}
                  alt={photo.filename}
                  loading="lazy"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <Show when={photo.description}>
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-2">
                    <p class="text-white text-xs line-clamp-2">{photo.description}</p>
                  </div>
                </Show>
              </a>
            );
          }}
        </For>
      </div>
    </>
  );
}

// ─── Single image detail view ─────────────────────────────────────────────────

function ImageView(props: { profileUid: number }) {
  const navigate   = useNavigate();
  const params     = useParams<{ nick?: string }>();
  const d          = detail;
  const [reply, setReply]         = createSignal('');
  const [showReply, setShowReply] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);

  const backHref = () => params.nick ? `/photos/${params.nick}` : '/photos';

  async function submitComment() {
    const body = reply().trim();
    if (!body) return;
    setSubmitting(true);
    try {
      await handleComment(body, props.profileUid);
      setReply('');
      setShowReply(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div class="flex flex-col gap-4">

      {/* Back breadcrumb */}
      <div class="flex items-center gap-2">
        <button
          onClick={() => navigate(backHref())}
          class="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition-colors"
        >
          <BiRegularChevronLeft size={16} />
          Back
        </button>
        <Show when={d()?.album}>
          <span class="text-zinc-300 dark:text-zinc-600">/</span>
          <span class="text-sm text-zinc-500 dark:text-zinc-400">{d()?.album}</span>
        </Show>
      </div>

      {/* Image */}
      <div class="relative rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
        <img
          src={d()?.src_full ?? d()?.src}
          alt={d()?.filename}
          class="max-h-[70vh] w-full object-contain"
        />

        {/* Prev / Next */}
        <Show when={d()?.prevlink}>
          <a
            href={d()!.prevlink!.replace(window.location.origin, '')}
            class="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full
                   bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <BiRegularChevronLeft size={22} />
          </a>
        </Show>
        <Show when={d()?.nextlink}>
          <a
            href={d()!.nextlink!.replace(window.location.origin, '')}
            class="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full
                   bg-black/40 hover:bg-black/60 text-white transition-colors"
          >
            <BiRegularChevronRight size={22} />
          </a>
        </Show>
      </div>

      {/* Meta + actions */}
      <div class="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <Show when={d()?.description}>
          <p class="text-zinc-800 dark:text-zinc-200 mb-3">{d()?.description}</p>
        </Show>
        <p class="text-xs text-zinc-400 mb-4">
          {d()?.created ? new Date(d()!.created).toLocaleString() : ''}
        </p>

        {/* Reaction bar */}
        <div class="flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
          <button
            onClick={handleLike}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    hover:bg-zinc-100 dark:hover:bg-zinc-800
                    ${d()?.viewer_liked ? 'text-blue-500' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            <BiRegularLike size={17} />
            <span>{d()?.like_count ?? 0}</span>
          </button>

          <button
            onClick={handleDislike}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                    hover:bg-zinc-100 dark:hover:bg-zinc-800
                    ${d()?.viewer_disliked ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
            <BiRegularDislike size={17} />
            <span>{d()?.dislike_count ?? 0}</span>
          </button>

          <Show when={d()?.item_id}>
            <button
              onClick={() => setShowReply(v => !v)}
              class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                     text-zinc-500 dark:text-zinc-400
                     hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <BiRegularChat size={17} />
              <span>Comment</span>
            </button>
          </Show>
        </div>

        {/* Reply composer */}
        <Show when={showReply()}>
          <div class="mt-3 flex flex-col gap-2">
            <textarea
              value={reply()}
              onInput={e => setReply(e.currentTarget.value)}
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
                onClick={() => { setShowReply(false); setReply(''); }}
                class="px-3 py-1.5 text-sm rounded-lg text-zinc-500
                       hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                disabled={submitting() || !reply().trim()}
                class="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg
                       bg-blue-500 hover:bg-blue-600 disabled:opacity-50
                       text-white transition-colors"
              >
                <BiRegularSend size={15} />
                {submitting() ? 'Sending…' : 'Send'}
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
                      {comment.author.name || 'Anonymous'}
                    </span>
                    <span class="text-xs text-zinc-400">
                      {new Date(comment.created).toLocaleString()}
                    </span>
                  </div>
                  <p class="text-sm text-zinc-700 dark:text-zinc-300 break-words">{comment.body}</p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
