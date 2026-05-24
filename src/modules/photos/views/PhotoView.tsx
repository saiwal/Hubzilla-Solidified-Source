import { A } from "@solidjs/router";
import { createEffect, createSignal, Show, For } from "solid-js";
import { useParams, useNavigate, useLocation } from "@solidjs/router";
import { useAuth } from "@/shared/store/auth-store";
import {
  photos, albumName, detail, loading,
  loadSummary, loadAlbum, loadImage, loadAlbums,
  handleLike, handleDislike, handleComment,
} from "../store/store";
import {
  MdFillChat, MdFillChevron_left, MdFillChevron_right,
  MdFillSend, MdOutlineThumb_down, MdOutlineThumb_up,
} from "solid-icons/md";

export default function Photos() {
  const params   = useParams<{ nick?: string; datum?: string }>();
  const location = useLocation();

  const datatype = () => {
    const p = location.pathname;
    if (p.includes('/image/')) return 'image';
    if (p.includes('/album/')) return 'album';
    return 'summary';
  };

  createEffect(() => {
    const n = params.nick ?? '';
    const d = params.datum ?? '';
    if (datatype() === 'album' && d) loadAlbum(n, d);
    else if (datatype() === 'image' && d) loadImage(n, d);
    else {
      loadSummary(n);
      loadAlbums(n);
    }
  });

  return (
    <div class="max-w-5xl mx-auto">
      <Show when={loading()}>
        <PhotoGridSkeleton />
      </Show>
      <Show when={!loading() && detail()}>
        <ImageView />
      </Show>
      <Show when={!loading() && !detail()}>
        <PhotoGrid />
      </Show>
    </div>
  );
}

// ── PhotoGrid ─────────────────────────────────────────────────────────────────

function PhotoGrid() {
  const navigate = useNavigate();
  const params   = useParams<{ nick?: string }>();

  return (
    <>
      <Show when={albumName()}>
        <div class="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(`/photos/${params.nick ?? ''}`)}
            class="text-sm text-muted hover:text-txt flex items-center gap-1 transition-colors"
          >
            <MdFillChevron_left size={16} /> All photos
          </button>
          <span class="text-subtle">/</span>
          <span class="text-sm font-medium text-txt">
            {albumName()}
          </span>
        </div>
      </Show>

      <Show when={photos().length === 0}>
        <p class="text-sm text-muted py-8 text-center">
          No photos yet.
        </p>
      </Show>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        <For each={photos()}>
          {(photo) => (
            <A
              href={`/photos/${params.nick}/image/${photo.resource_id}`}
              class="group relative aspect-square overflow-hidden rounded-xl bg-surface block"
            >
              <img
                src={photo.src}
                alt={photo.filename}
                loading="lazy"
                class="w-full h-full object-cover transition-transform duration-300
                       group-hover:scale-105"
              />
              <Show when={photo.description}>
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100
                            transition-opacity duration-200 flex items-end p-2">
                  <p class="text-white text-xs line-clamp-2">{photo.description}</p>
                </div>
              </Show>
            </A>
          )}
        </For>
      </div>
    </>
  );
}

// ── ImageView ─────────────────────────────────────────────────────────────────

function ImageView() {
  const navigate  = useNavigate();
  const params    = useParams<{ nick?: string }>();
  const auth      = useAuth();
  const d         = detail;
  const [reply, setReply]           = createSignal('');
  const [showReply, setShowReply]   = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);

  const profileUid = () => auth()?.uid ?? 0;

  async function submitComment() {
    const body = reply().trim();
    if (!body) return;
    setSubmitting(true);
    try {
      await handleComment(body, profileUid());
      setReply('');
      setShowReply(false);
    } finally {
      setSubmitting(false);
    }
  }

  const prevPath = () => d()?.prevlink?.replace(window.location.origin, '') ?? null;
  const nextPath = () => d()?.nextlink?.replace(window.location.origin, '') ?? null;

  return (
    <div class="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div class="flex items-center gap-2">
        <button
          onClick={() => navigate(`/photos/${params.nick ?? ''}`)}
          class="text-sm text-muted hover:text-txt flex items-center gap-1 transition-colors"
        >
          <MdFillChevron_left size={16} /> Back
        </button>
        <Show when={d()?.album}>
          <span class="text-subtle">/</span>
          <span class="text-sm text-muted">{d()?.album}</span>
        </Show>
      </div>

      {/* Image */}
      <div class="relative rounded-2xl overflow-hidden bg-overlay
                  flex items-center justify-center min-h-48">
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

      {/* Meta + reactions */}
      <div class="bg-elevated border border-rim rounded-2xl p-5">
        <Show when={d()?.description}>
          <p class="text-txt mb-3">{d()?.description}</p>
        </Show>
        <p class="text-xs text-subtle mb-4">
          {d()?.created ? new Date(d()!.created).toLocaleString() : ''}
        </p>
        <div class="flex items-center gap-2 border-t border-rim pt-3">
          <button
            onClick={handleLike}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                    transition-colors hover:bg-surface
                    ${d()?.viewer_liked ? 'text-accent' : 'text-muted'}`}
          >
            <MdOutlineThumb_up size={17} />
            <span>{d()?.like_count ?? 0}</span>
          </button>
          <button
            onClick={handleDislike}
            class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                    transition-colors hover:bg-surface
                    ${d()?.viewer_disliked ? 'text-red-500' : 'text-muted'}`}
          >
            <MdOutlineThumb_down size={17} />
            <span>{d()?.dislike_count ?? 0}</span>
          </button>
          <Show when={d()?.item_id}>
            <button
              onClick={() => setShowReply(v => !v)}
              class="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                     font-medium text-muted hover:bg-surface transition-colors"
            >
              <MdFillChat size={17} /> Comment
            </button>
          </Show>
        </div>

        <Show when={showReply()}>
          <div class="mt-3 flex flex-col gap-2">
            <textarea
              value={reply()}
              onInput={e => setReply(e.currentTarget.value)}
              placeholder="Write a comment…"
              rows={3}
              class="w-full rounded-xl border border-rim bg-surface text-txt
                     text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2
                     focus:ring-accent/30 placeholder:text-muted"
            />
            <div class="flex justify-end gap-2">
              <button
                onClick={() => { setShowReply(false); setReply(''); }}
                class="px-3 py-1.5 text-sm rounded-lg text-muted hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitComment}
                disabled={submitting() || !reply().trim()}
                class="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium
                       rounded-lg bg-accent text-accent-fg disabled:opacity-50
                       hover:opacity-90 transition-opacity"
              >
                <MdFillSend size={15} />
                {submitting() ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </Show>
      </div>

      {/* Comments */}
      <Show when={(d()?.comments?.length ?? 0) > 0}>
        <div class="flex flex-col gap-3">
          <h3 class="text-sm font-semibold text-muted uppercase tracking-wide">
            Comments
          </h3>
          <For each={d()?.comments}>
            {(comment) => (
              <div class="bg-elevated border border-rim rounded-xl p-4 flex gap-3">
                <Show when={comment.author.photo}>
                  <img
                    src={comment.author.photo}
                    alt={comment.author.name}
                    class="w-8 h-8 rounded-full object-cover ring-1 ring-rim shrink-0"
                  />
                </Show>
                <div class="flex flex-col gap-1 min-w-0">
                  <div class="flex items-baseline gap-2">
                    <span class="text-sm font-semibold text-txt">
                      {comment.author.name || 'Anonymous'}
                    </span>
                    <span class="text-xs text-subtle">
                      {new Date(comment.created).toLocaleString()}
                    </span>
                  </div>
                  <p class="text-sm text-muted break-words">
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

// ── Skeletons ─────────────────────────────────────────────────────────────────

function PhotoGridSkeleton() {
  return (
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      <For each={Array(8).fill(0)}>
        {() => (
          <div class="aspect-square rounded-xl bg-surface animate-pulse" />
        )}
      </For>
    </div>
  );
}
