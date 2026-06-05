import { A } from "@solidjs/router";
import { createEffect, createMemo, createSignal, Show, For } from "solid-js";
import { useParams, useNavigate, useLocation } from "@solidjs/router";
import { useI18n } from "@/i18n";
import { useAuth } from "@/shared/store/auth-store";
import {
  photos, albumName, detail, loading,
  loadSummary, loadAlbum, loadImage, loadAlbums,
  handleLike, handleDislike, addComment, handleCommentReaction,
} from "../store/store";
import {
  MdFillChat, MdFillChevron_left, MdFillChevron_right,
  MdOutlineThumb_down, MdOutlineThumb_up,
  MdFillKeyboard_arrow_down, MdFillKeyboard_arrow_up,
  MdFillAccount_tree, MdFillFormat_list_bulleted,
} from "solid-icons/md";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import CommentThread from "@/shared/views/CommentThread";
import { buildThreadTree } from "@/shared/lib/thread";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "@/shared/stream/types";
import type { PhotoComment } from "../api/api";

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
  const { t } = useI18n();

  return (
    <>
      <Show when={albumName()}>
        <div class="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate(`/photos/${params.nick ?? ''}`)}
            class="text-sm text-muted hover:text-txt flex items-center gap-1 transition-colors"
          >
            <MdFillChevron_left size={16} /> {t("photos.all_photos")}
          </button>
          <span class="text-subtle">/</span>
          <span class="text-sm font-medium text-txt">
            {albumName()}
          </span>
        </div>
      </Show>

      <Show when={photos().length === 0}>
        <p class="text-sm text-muted py-8 text-center">
          {t("photos.no_photos")}
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

function commentToNode(c: PhotoComment, photoMid: string, profileUid: number): ThreadNode {
  return {
    id: String(c.iid || c.mid),
    iid: c.iid || undefined,
    uuid: c.mid,
    profileUid,
    mid: c.mid,
    parent_mid: c.thr_parent || photoMid,
    thr_parent: c.thr_parent || photoMid,
    top_mid: photoMid,
    parent: '',
    body: c.body,
    title: '',
    authorName: c.author.name,
    authorAvatar: c.author.photo,
    authorUrl: c.author.url,
    created: c.created,
    verb: 'Create',
    item_thread_top: 0,
    flags: [],
    permalink: c.author.url || '',
    children: [],
    commentCount: 0,
    likeCount: c.like_count ?? 0,
    dislikeCount: c.dislike_count ?? 0,
    repeatCount: 0,
    viewerLiked: c.viewer_liked ?? false,
    viewerDisliked: c.viewer_disliked ?? false,
    viewerRepeated: false,
  };
}

function flattenForDisplay(nodes: ThreadNode[]): ThreadNode[] {
  const result: ThreadNode[] = [];
  for (const node of nodes) {
    result.push({ ...node, children: [] });
    result.push(...flattenForDisplay(node.children));
  }
  return result;
}

function ImageView() {
  const navigate  = useNavigate();
  const params    = useParams<{ nick?: string }>();
  const auth      = useAuth();
  const { t }     = useI18n();
  const d         = detail;
  const [showTopReply, setShowTopReply] = createSignal(false);
  const [showComments, setShowComments] = createSignal(true);
  const [threaded, setThreaded]         = createSignal(true);

  const prevPath = () => d()?.prevlink?.replace(window.location.origin, '') ?? null;
  const nextPath = () => d()?.nextlink?.replace(window.location.origin, '') ?? null;
  const photoMid = () => d()?.item_mid ?? '';
  const profileUid = () => auth()?.uid ?? 0;
  const commentCount = () => d()?.comments?.length ?? 0;

  const commentNodes = createMemo(() => {
    const items = d()?.comments ?? [];
    const mid = photoMid();
    const uid = profileUid();
    return buildThreadTree(items.map(c => commentToNode(c, mid, uid)));
  });

  const hasNested = () => commentNodes().some(n => n.children.length > 0);

  const visibleComments = () =>
    threaded() ? commentNodes() : flattenForDisplay(commentNodes());

  const handlers: StreamHandlers = {
    onLike:    (mid) => handleCommentReaction(mid, 'like'),
    onDislike: (mid) => handleCommentReaction(mid, 'dislike'),
    onRepeat:  () => {},
    onComment: (parentMid, body) => {
      addComment({
        iid: 0,
        mid: crypto.randomUUID(),
        body,
        thr_parent: parentMid,
        created: new Date().toISOString().replace('T', ' ').slice(0, 19),
        author: { name: auth()?.nick ?? '', url: '', photo: '' },
      });
    },
    onLoadComments: async () => {},
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Breadcrumb */}
      <div class="flex items-center gap-2">
        <button
          onClick={() => navigate(`/photos/${params.nick ?? ''}`)}
          class="text-sm text-muted hover:text-txt flex items-center gap-1 transition-colors"
        >
          <MdFillChevron_left size={16} /> {t("photos.back")}
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
        <p class="text-xs text-muted mb-4">
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
              onClick={() => setShowTopReply(v => !v)}
              class={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                     font-medium transition-colors hover:bg-surface
                     ${showTopReply() ? 'text-accent' : 'text-muted'}`}
            >
              <MdFillChat size={17} /> {t("photos.comment")}
            </button>
          </Show>
        </div>

        <Show when={showTopReply() && d()?.item_id}>
          <CommentComposer
            parentMid={d()?.item_mid ?? undefined}
            parentIid={d()?.item_id ?? undefined}
            profileUid={profileUid()}
            onSubmitted={(body) => {
              addComment({
                iid: 0,
                mid: crypto.randomUUID(),
                body,
                thr_parent: photoMid(),
                created: new Date().toISOString().replace('T', ' ').slice(0, 19),
                author: { name: auth()?.nick ?? '', url: '', photo: '' },
              });
              setShowTopReply(false);
            }}
          />
        </Show>
      </div>

      {/* Comments */}
      <Show when={commentCount() > 0}>
        <div class="flex flex-col gap-2">
          {/* Comments header */}
          <div class="flex items-center gap-2 px-1">
            <button
              onClick={() => setShowComments(v => !v)}
              class="flex items-center gap-1.5 text-sm font-semibold text-muted
                     uppercase tracking-wide hover:text-txt transition-colors"
            >
              <Show when={showComments()} fallback={<MdFillKeyboard_arrow_down size={15} />}>
                <MdFillKeyboard_arrow_up size={15} />
              </Show>
              {commentCount()} comment{commentCount() !== 1 ? 's' : ''}
            </button>
            <Show when={hasNested()}>
              <button
                onClick={() => setThreaded(v => !v)}
                title={threaded() ? t("photos.switch_flat") : t("photos.switch_threaded")}
                class="ml-2 flex items-center gap-1 px-2 py-1 rounded-md text-xs
                       text-muted hover:text-txt hover:bg-surface transition-colors"
              >
                <Show when={threaded()} fallback={<MdFillAccount_tree size={14} />}>
                  <MdFillFormat_list_bulleted size={14} />
                </Show>
                <span>{threaded() ? t("photos.flat") : t("photos.threaded")}</span>
              </button>
            </Show>
          </div>

          <CommentThread
            comments={visibleComments()}
            show={showComments()}
            handlers={handlers}
          />
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
