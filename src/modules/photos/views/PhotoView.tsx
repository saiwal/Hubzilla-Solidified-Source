import { A } from "@solidjs/router";
import { createEffect, createMemo, createSignal, lazy, onCleanup, Show, For } from "solid-js";
import { Portal } from "solid-js/web";
import { useParams, useNavigate, useLocation } from "@solidjs/router";
import { useI18n } from "@/i18n";
import { useAuth } from "@/shared/store/auth-store";
import {
  photos, albums, albumName, detail, loading, albumsLoading,
  loadSummary, loadAlbum, loadImage, loadAlbums,
  handleLike, handleDislike, addComment, handleCommentReaction,
  createNewAlbum, deletePhotoAction, batchDeleteAction, deleteAlbumAction, renamePhotoAction,
} from "../store/store";
import {
  MdFillChat, MdFillChevron_left, MdFillChevron_right,
  MdFillThumb_up, MdFillThumb_down,
  MdOutlineThumb_down, MdOutlineThumb_up,
  MdFillKeyboard_arrow_down, MdFillKeyboard_arrow_up,
  MdFillAccount_tree, MdFillFormat_list_bulleted,
  MdOutlineEdit, MdOutlineDelete, MdOutlineReply, MdFillMore_vert,
  MdOutlineLock,
  MdFillApps, MdFillCollections,
  MdFillAdd, MdFillClose,
  MdFillCloud_upload, MdFillDelete_forever,
  MdFillCheck_box, MdFillCheck_box_outline_blank,
} from "solid-icons/md";
import CommentComposer from "@/shared/editor/composers/CommentComposer";
import CommentThread from "@/shared/views/CommentThread";
import AclEditor from "../components/AclEditor";
import { buildThreadTree } from "@/shared/lib/thread";
import type { ThreadNode } from "@/shared/lib/thread";
import type { StreamHandlers } from "@/shared/stream/types";
import type { PhotoComment } from "../api/api";
import { uploadPhotoEdit, uploadNewPhoto } from "../api/api";
import { toast } from "@/shared/store/toast";

const ImageEditor = lazy(() => import("@/shared/views/ImageEditor"));

export default function Photos() {
  const params   = useParams<{ nick?: string; datum?: string }>();
  const location = useLocation();

  const datatype = () => {
    const p = location.pathname;
    if (/\/image(\/|$)/.test(p)) return 'image';
    if (/\/album(\/|$)/.test(p)) return 'album';
    return 'summary';
  };

  createEffect(() => {
    const n = params.nick ?? '';
    const d = params.datum ?? '';
    if (datatype() === 'album') loadAlbum(n, d);
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
        <Show when={datatype() === 'album'} fallback={<SummaryView />}>
          <AlbumGrid />
        </Show>
      </Show>
    </div>
  );
}

// ── SummaryView ───────────────────────────────────────────────────────────────

type SortKey  = 'date' | 'name' | 'size';
type ViewMode = 'grid' | 'list';

function SummaryView() {
  const params   = useParams<{ nick?: string }>();
  const auth     = useAuth();
  const { t }    = useI18n();
  const [sortBy, setSortBy]         = createSignal<SortKey>('date');
  const [viewMode, setViewMode]     = createSignal<ViewMode>('grid');
  const [showForm, setShowForm]     = createSignal(false);
  const [newName, setNewName]       = createSignal('');
  const [creating, setCreating]     = createSignal(false);
  const [createError, setCreateError] = createSignal('');

  const isOwner = () => !!auth()?.nick && auth()!.nick === params.nick;

  const sortedAlbums = createMemo(() => {
    const a = albums();
    if (sortBy() === 'name') return [...a].sort((x, y) => x.album.localeCompare(y.album));
    if (sortBy() === 'size') return [...a].sort((x, y) => y.total - x.total);
    return a;
  });

  const sortLabels: Record<SortKey, string> = {
    date: t("photos.sort_date"),
    name: t("photos.sort_name"),
    size: t("photos.sort_size"),
  };

  async function handleCreate(e: Event) {
    e.preventDefault();
    const name = newName().trim();
    if (!name) return;
    setCreating(true);
    setCreateError('');
    try {
      await createNewAlbum(params.nick ?? '', name);
      setNewName('');
      setShowForm(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t("photos.album_error"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div class="flex flex-col gap-4">
      {/* Toolbar */}
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-muted">{t("photos.sort_by")}:</span>
        <For each={(['date', 'name', 'size'] as SortKey[])}>
          {(s) => (
            <button
              onClick={() => setSortBy(s)}
              class={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                ${sortBy() === s
                  ? 'bg-surface text-txt'
                  : 'text-muted hover:text-txt hover:bg-surface/50'}`}
            >
              {sortLabels[s]}
            </button>
          )}
        </For>

        <div class="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            title={t("photos.view_grid")}
            class={`p-1.5 rounded-md transition-colors
              ${viewMode() === 'grid' ? 'text-accent bg-surface' : 'text-muted hover:text-txt'}`}
          >
            <MdFillApps size={17} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title={t("photos.view_list")}
            class={`p-1.5 rounded-md transition-colors
              ${viewMode() === 'list' ? 'text-accent bg-surface' : 'text-muted hover:text-txt'}`}
          >
            <MdFillFormat_list_bulleted size={17} />
          </button>

          <Show when={isOwner()}>
            <button
              onClick={() => { setShowForm(v => !v); setCreateError(''); setNewName(''); }}
              title={t("photos.new_album")}
              class={`ml-1 p-1.5 rounded-md transition-colors
                ${showForm() ? 'text-accent bg-surface' : 'text-muted hover:text-txt'}`}
            >
              <Show when={showForm()} fallback={<MdFillAdd size={17} />}>
                <MdFillClose size={17} />
              </Show>
            </button>
          </Show>
        </div>
      </div>

      {/* New album form */}
      <Show when={showForm()}>
        <form
          onSubmit={handleCreate}
          class="flex items-center gap-2 p-3 bg-surface rounded-xl border border-rim"
        >
          <input
            type="text"
            value={newName()}
            onInput={e => setNewName(e.currentTarget.value)}
            placeholder={t("photos.album_name_ph")}
            disabled={creating()}
            autofocus
            class="flex-1 bg-transparent text-sm text-txt placeholder:text-muted
                   outline-none disabled:opacity-50"
          />
          <Show when={createError()}>
            <span class="text-xs text-red-500">{createError()}</span>
          </Show>
          <button
            type="submit"
            disabled={creating() || !newName().trim()}
            class="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium
                   transition-opacity disabled:opacity-40"
          >
            {creating() ? t("photos.album_creating") : t("photos.album_create")}
          </button>
        </form>
      </Show>

      {/* Albums loading skeleton */}
      <Show when={albumsLoading()}>
        <AlbumSkeleton mode={viewMode()} />
      </Show>

      {/* Empty */}
      <Show when={!albumsLoading() && sortedAlbums().length === 0}>
        <p class="text-sm text-muted py-8 text-center">{t("photos.no_albums")}</p>
      </Show>

      {/* Grid mode */}
      <Show when={!albumsLoading() && viewMode() === 'grid'}>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <For each={sortedAlbums()}>
            {(album) => (
              <A
                href={`/photos/${params.nick}/album/${album.folder}`}
                class="group block rounded-xl overflow-hidden bg-surface
                       hover:bg-elevated transition-colors border border-rim"
              >
                <div class="aspect-square overflow-hidden bg-overlay">
                  <Show
                    when={album.thumb}
                    fallback={
                      <div class="w-full h-full flex items-center justify-center">
                        <MdFillCollections size={40} class="text-subtle" />
                      </div>
                    }
                  >
                    <img
                      src={album.thumb!}
                      alt={album.album}
                      loading="lazy"
                      class="w-full h-full object-cover transition-transform
                             duration-300 group-hover:scale-105"
                    />
                  </Show>
                </div>
                <div class="p-2.5">
                  <p class="text-sm font-medium text-txt truncate">{album.album}</p>
                  <p class="text-xs text-muted">{album.total} {t("photos.photos_count")}</p>
                </div>
              </A>
            )}
          </For>
        </div>
      </Show>

      {/* List mode */}
      <Show when={!albumsLoading() && viewMode() === 'list'}>
        <div class="flex flex-col divide-y divide-rim">
          <For each={sortedAlbums()}>
            {(album) => (
              <A
                href={`/photos/${params.nick}/album/${album.folder}`}
                class="flex items-center gap-3 py-2.5 px-2 hover:bg-surface
                       transition-colors rounded-lg"
              >
                <div class="w-12 h-12 rounded-lg overflow-hidden bg-overlay flex-shrink-0">
                  <Show
                    when={album.thumb}
                    fallback={
                      <div class="w-full h-full flex items-center justify-center">
                        <MdFillCollections size={22} class="text-subtle" />
                      </div>
                    }
                  >
                    <img
                      src={album.thumb!}
                      alt={album.album}
                      loading="lazy"
                      class="w-full h-full object-cover"
                    />
                  </Show>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-txt truncate">{album.album}</p>
                  <p class="text-xs text-muted">{album.total} {t("photos.photos_count")}</p>
                </div>
                <MdFillChevron_right size={18} class="text-subtle flex-shrink-0" />
              </A>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

function AlbumSkeleton(props: { mode: ViewMode }) {
  return (
    <Show
      when={props.mode === 'grid'}
      fallback={
        <div class="flex flex-col divide-y divide-rim">
          <For each={Array(4).fill(0)}>
            {() => (
              <div class="flex items-center gap-3 py-2.5 px-2">
                <div class="w-12 h-12 rounded-lg bg-surface animate-pulse flex-shrink-0" />
                <div class="flex-1 flex flex-col gap-1.5">
                  <div class="h-3.5 w-32 bg-surface animate-pulse rounded" />
                  <div class="h-3 w-16 bg-surface animate-pulse rounded" />
                </div>
              </div>
            )}
          </For>
        </div>
      }
    >
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <For each={Array(8).fill(0)}>
          {() => (
            <div class="rounded-xl overflow-hidden border border-rim">
              <div class="aspect-square bg-surface animate-pulse" />
              <div class="p-2.5 flex flex-col gap-1.5">
                <div class="h-3.5 w-20 bg-surface animate-pulse rounded" />
                <div class="h-3 w-12 bg-surface animate-pulse rounded" />
              </div>
            </div>
          )}
        </For>
      </div>
    </Show>
  );
}

// ── AlbumGrid ─────────────────────────────────────────────────────────────────

function AlbumGrid() {
  const navigate = useNavigate();
  const params   = useParams<{ nick?: string; datum?: string }>();
  const auth     = useAuth();
  const { t }    = useI18n();

  // View controls
  const [sortBy, setSortBy]     = createSignal<'date' | 'name'>('date');
  const [viewMode, setViewMode] = createSignal<'grid' | 'list'>('grid');

  // Selection
  const [selectMode, setSelectMode]       = createSignal(false);
  const [selected, setSelected]           = createSignal<Set<string>>(new Set());
  const [confirmBatch, setConfirmBatch]   = createSignal(false);
  const [batchDeleting, setBatchDeleting] = createSignal(false);

  // Album deletion
  const [confirmAlbum, setConfirmAlbum]   = createSignal(false);
  const [deletingAlbum, setDeletingAlbum] = createSignal(false);

  // Per-photo pending confirm (resource_id)
  const [pendingDelete, setPendingDelete] = createSignal<string | null>(null);

  // ACL editor
  const [aclOpen, setAclOpen] = createSignal(false);

  // Upload progress
  const [uploadProgress, setUploadProgress] =
    createSignal<{ done: number; total: number } | null>(null);
  let fileInputRef: HTMLInputElement | undefined;

  const isOwner = () => !!auth()?.nick && auth()!.nick === params.nick;

  const sortedPhotos = createMemo(() => {
    const p = photos();
    if (sortBy() === 'name')
      return [...p].sort((a, b) => a.filename.localeCompare(b.filename));
    return [...p].sort((a, b) => b.created.localeCompare(a.created));
  });

  const allSelected = () =>
    sortedPhotos().length > 0 && selected().size === sortedPhotos().length;

  function toggleSelectAll() {
    if (allSelected()) setSelected(new Set<string>());
    else setSelected(new Set(sortedPhotos().map(p => p.resource_id)));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set<string>());
    setConfirmBatch(false);
  }

  async function handleFiles(files: FileList) {
    const nick   = params.nick ?? '';
    const folder = params.datum ?? '';
    const album  = albumName();
    setUploadProgress({ done: 0, total: files.length });
    let failed = 0;
    for (let i = 0; i < files.length; i++) {
      try { await uploadNewPhoto(nick, files[i], album, folder); }
      catch { failed++; }
      setUploadProgress({ done: i + 1, total: files.length });
    }
    setUploadProgress(null);
    if (folder) loadAlbum(nick, folder);
    if (failed > 0) toast.error(t("photos.upload_failed"));
  }

  async function handleDeleteAlbum() {
    if (!confirmAlbum()) { setConfirmAlbum(true); return; }
    setDeletingAlbum(true);
    try {
      await deleteAlbumAction(params.nick ?? '', params.datum ?? '');
      navigate(`/photos/${params.nick ?? ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("photos.delete_error"));
      setDeletingAlbum(false);
      setConfirmAlbum(false);
    }
  }

  async function handleDeletePhoto(resourceId: string) {
    if (pendingDelete() !== resourceId) { setPendingDelete(resourceId); return; }
    setPendingDelete(null);
    try {
      await deletePhotoAction(params.nick ?? '', resourceId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("photos.delete_error"));
    }
  }

  async function handleBatchDelete() {
    if (!confirmBatch()) { setConfirmBatch(true); return; }
    setBatchDeleting(true);
    try {
      await batchDeleteAction(params.nick ?? '', Array.from(selected()));
      exitSelectMode();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("photos.delete_error"));
    } finally {
      setBatchDeleting(false);
    }
  }

  return (
    <div class="flex flex-col gap-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        class="hidden"
        onChange={e => e.currentTarget.files && handleFiles(e.currentTarget.files)}
      />

      {/* Breadcrumb */}
      <div class="flex items-center gap-2">
        <button
          onClick={() => navigate(`/photos/${params.nick ?? ''}`)}
          class="text-sm text-muted hover:text-txt flex items-center gap-1 transition-colors"
        >
          <MdFillChevron_left size={16} /> {t("photos.all_photos")}
        </button>
        <Show when={albumName()}>
          <span class="text-subtle">/</span>
          <span class="text-sm font-medium text-txt">{albumName()}</span>
        </Show>
      </div>

      {/* Toolbar */}
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-xs text-muted">{t("photos.sort_by")}:</span>
        <For each={(['date', 'name'] as const)}>
          {(s) => (
            <button
              onClick={() => setSortBy(s)}
              class={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors
                ${sortBy() === s ? 'bg-surface text-txt' : 'text-muted hover:text-txt hover:bg-surface/50'}`}
            >
              {s === 'date' ? t("photos.sort_date") : t("photos.sort_name")}
            </button>
          )}
        </For>

        <div class="flex items-center gap-1 ml-auto">
          <button onClick={() => setViewMode('grid')} title={t("photos.view_grid")}
            class={`p-1.5 rounded-md transition-colors
              ${viewMode() === 'grid' ? 'text-accent bg-surface' : 'text-muted hover:text-txt'}`}>
            <MdFillApps size={17} />
          </button>
          <button onClick={() => setViewMode('list')} title={t("photos.view_list")}
            class={`p-1.5 rounded-md transition-colors
              ${viewMode() === 'list' ? 'text-accent bg-surface' : 'text-muted hover:text-txt'}`}>
            <MdFillFormat_list_bulleted size={17} />
          </button>
        </div>

        <Show when={isOwner()}>
          {/* Upload */}
          <button
            onClick={() => fileInputRef?.click()}
            disabled={!!uploadProgress()}
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                   bg-accent/10 text-accent hover:bg-accent/20 transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <MdFillCloud_upload size={15} />
            {uploadProgress()
              ? `${uploadProgress()!.done}/${uploadProgress()!.total}`
              : t("photos.upload")}
          </button>

          {/* Select / Cancel */}
          <Show when={!selectMode()} fallback={
            <button onClick={exitSelectMode}
              class="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-txt transition-colors">
              {t("photos.cancel")}
            </button>
          }>
            <button onClick={() => setSelectMode(true)}
              class="px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted hover:text-txt transition-colors">
              {t("photos.select")}
            </button>
          </Show>

          {/* Delete album */}
          <Show when={!selectMode()}>
            <Show when={confirmAlbum()} fallback={
              <button onClick={handleDeleteAlbum} disabled={deletingAlbum()}
                class="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500/70
                       hover:text-red-500 hover:bg-red-500/10 transition-colors">
                {t("photos.delete_album")}
              </button>
            }>
              <div class="flex items-center gap-1">
                <span class="text-xs text-red-500">{t("photos.confirm")}?</span>
                <button onClick={handleDeleteAlbum} disabled={deletingAlbum()}
                  class="px-2 py-1 rounded-md text-xs font-medium bg-red-500 text-white
                         hover:bg-red-600 transition-colors disabled:opacity-50">
                  {deletingAlbum() ? t("photos.batch_deleting") : t("photos.delete_album")}
                </button>
                <button onClick={() => setConfirmAlbum(false)}
                  class="px-2 py-1 rounded-md text-xs text-muted hover:text-txt transition-colors">
                  {t("photos.cancel")}
                </button>
              </div>
            </Show>
          </Show>

          {/* Album privacy — only for real albums (non-root) */}
          <Show when={!selectMode() && !!params.datum}>
            <button
              onClick={() => setAclOpen(v => !v)}
              title={t("photos.acl_privacy")}
              class={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
                     transition-colors
                     ${aclOpen()
                       ? 'text-accent bg-accent/10'
                       : 'text-muted hover:text-txt hover:bg-surface/50'}`}
            >
              <MdOutlineLock size={15} />
              {t("photos.acl_privacy")}
            </button>
          </Show>
        </Show>
      </div>

      {/* Album ACL editor */}
      <Show when={aclOpen() && !!params.datum}>
        <AclEditor
          nick={params.nick ?? ''}
          type="album"
          datum={params.datum ?? ''}
          onClose={() => setAclOpen(false)}
        />
      </Show>

      {/* Batch action bar */}
      <Show when={selectMode() && selected().size > 0}>
        <div class="flex items-center gap-3 px-3 py-2 bg-surface rounded-xl border border-rim">
          <span class="text-sm text-txt font-medium">
            {selected().size} {t("photos.selected")}
          </span>
          <div class="flex items-center gap-2 ml-auto">
            <Show when={confirmBatch()} fallback={
              <button onClick={handleBatchDelete}
                class="px-3 py-1.5 rounded-lg text-xs font-medium text-red-500
                       hover:bg-red-500/10 transition-colors">
                {t("photos.delete_selected")}
              </button>
            }>
              <span class="text-xs text-red-500">{t("photos.confirm")}?</span>
              <button onClick={handleBatchDelete} disabled={batchDeleting()}
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white
                       hover:bg-red-600 transition-colors disabled:opacity-50">
                {batchDeleting() ? t("photos.batch_deleting") : t("photos.delete_selected")}
              </button>
              <button onClick={() => setConfirmBatch(false)}
                class="px-2 py-1 rounded-md text-xs text-muted hover:text-txt transition-colors">
                {t("photos.cancel")}
              </button>
            </Show>
          </div>
        </div>
      </Show>

      {/* Select-all row */}
      <Show when={selectMode()}>
        <div class="flex items-center gap-2 px-1">
          <button onClick={toggleSelectAll}
            class="flex items-center gap-2 text-sm text-muted hover:text-txt transition-colors">
            <Show when={allSelected()} fallback={<MdFillCheck_box_outline_blank size={18} />}>
              <MdFillCheck_box size={18} class="text-accent" />
            </Show>
            Select all ({sortedPhotos().length})
          </button>
        </div>
      </Show>

      <Show when={photos().length === 0}>
        <p class="text-sm text-muted py-8 text-center">{t("photos.no_photos")}</p>
      </Show>

      {/* Grid mode */}
      <Show when={viewMode() === 'grid'}>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          <For each={sortedPhotos()}>
            {(photo) => {
              const isSelected = () => selected().has(photo.resource_id);
              const isPending  = () => pendingDelete() === photo.resource_id;
              return (
                <div class="group relative aspect-square overflow-hidden rounded-xl bg-surface">
                  <Show when={!selectMode()} fallback={
                    <button onClick={() => toggleOne(photo.resource_id)} class="block w-full h-full">
                      <img src={photo.src} alt={photo.filename} loading="lazy"
                        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </button>
                  }>
                    <A href={`/photos/${params.nick}/image/${photo.resource_id}`} class="block w-full h-full">
                      <img src={photo.src} alt={photo.filename} loading="lazy"
                        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </A>
                  </Show>

                  {/* Checkbox overlay */}
                  <Show when={selectMode()}>
                    <div class={`absolute top-1.5 left-1.5 drop-shadow
                      ${isSelected() ? 'text-accent' : 'text-white'}`}>
                      <Show when={isSelected()} fallback={<MdFillCheck_box_outline_blank size={20} />}>
                        <MdFillCheck_box size={20} />
                      </Show>
                    </div>
                    <Show when={isSelected()}>
                      <div class="absolute inset-0 ring-2 ring-accent ring-inset rounded-xl pointer-events-none" />
                    </Show>
                  </Show>

                  {/* Per-photo delete (owner, non-select mode) */}
                  <Show when={isOwner() && !selectMode()}>
                    <Show when={isPending()} fallback={
                      <button
                        onClick={() => handleDeletePhoto(photo.resource_id)}
                        class="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/50 text-white
                               opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MdFillDelete_forever size={16} />
                      </button>
                    }>
                      <div class="absolute top-1.5 right-1.5 flex items-center gap-1">
                        <button onClick={() => handleDeletePhoto(photo.resource_id)}
                          class="px-2 py-0.5 rounded-md bg-red-500 text-white text-xs font-medium">
                          {t("photos.confirm")}
                        </button>
                        <button onClick={() => setPendingDelete(null)}
                          class="p-1 rounded-md bg-black/50 text-white">
                          <MdFillClose size={14} />
                        </button>
                      </div>
                    </Show>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>

      {/* List mode */}
      <Show when={viewMode() === 'list'}>
        <div class="flex flex-col divide-y divide-rim">
          <For each={sortedPhotos()}>
            {(photo) => {
              const isSelected = () => selected().has(photo.resource_id);
              const isPending  = () => pendingDelete() === photo.resource_id;
              return (
                <div class={`flex items-center gap-3 py-2 px-2 hover:bg-surface/50 rounded-lg
                  ${isSelected() ? 'bg-accent/5' : ''}`}>
                  <Show when={selectMode()}>
                    <button onClick={() => toggleOne(photo.resource_id)}
                      class={isSelected() ? 'text-accent' : 'text-muted'}>
                      <Show when={isSelected()} fallback={<MdFillCheck_box_outline_blank size={18} />}>
                        <MdFillCheck_box size={18} />
                      </Show>
                    </button>
                  </Show>

                  <A href={`/photos/${params.nick}/image/${photo.resource_id}`}
                    class="w-12 h-12 rounded-lg overflow-hidden bg-overlay flex-shrink-0 block">
                    <img src={photo.src} alt={photo.filename} loading="lazy"
                      class="w-full h-full object-cover" />
                  </A>

                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-txt truncate">{photo.filename}</p>
                    <p class="text-xs text-muted">
                      {photo.created ? new Date(photo.created).toLocaleDateString() : ''}
                    </p>
                  </div>

                  <Show when={isOwner() && !selectMode()}>
                    <Show when={isPending()} fallback={
                      <button onClick={() => handleDeletePhoto(photo.resource_id)}
                        class="p-1.5 rounded-md text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors">
                        <MdFillDelete_forever size={16} />
                      </button>
                    }>
                      <div class="flex items-center gap-1">
                        <button onClick={() => handleDeletePhoto(photo.resource_id)}
                          class="px-2 py-1 rounded-md bg-red-500 text-white text-xs">
                          {t("photos.confirm")}
                        </button>
                        <button onClick={() => setPendingDelete(null)}
                          class="p-1 rounded-md text-muted hover:text-txt">
                          <MdFillClose size={14} />
                        </button>
                      </div>
                    </Show>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
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

  const [replyOpen, setReplyOpen]         = createSignal(false);
  const [showComments, setShowComments]   = createSignal(true);
  const [threaded, setThreaded]           = createSignal(true);
  const [editFile, setEditFile]           = createSignal<File | null>(null);
  const [editUploading, setEditUploading] = createSignal(false);
  const [moreOpen, setMoreOpen]           = createSignal(false);
  const [moreAnchor, setMoreAnchor]       = createSignal<{ bottom: number; right: number } | null>(null);
  const [deleteConfirming, setDeleteConfirming] = createSignal(false);
  const [aclOpen, setAclOpen]                   = createSignal(false);
  const [renameOpen, setRenameOpen]             = createSignal(false);
  const [renameInput, setRenameInput]           = createSignal('');
  const [renaming, setRenaming]                 = createSignal(false);
  let moreRef!: HTMLDivElement;
  let morePortalRef!: HTMLDivElement;
  let deleteTimer: ReturnType<typeof setTimeout> | null = null;

  onCleanup(() => { if (deleteTimer) clearTimeout(deleteTimer); });

  const isOwner = () => !!auth()?.nick && auth()!.nick === params.nick;

  createEffect(() => {
    if (!moreOpen()) return;
    const handler = (e: MouseEvent) => {
      if (!moreRef?.contains(e.target as Node) && !morePortalRef?.contains(e.target as Node))
        setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    onCleanup(() => document.removeEventListener("mousedown", handler));
  });

  function openMoreDropdown() {
    if (!moreOpen()) {
      const rect = moreRef.getBoundingClientRect();
      setMoreAnchor({ bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right });
    }
    setMoreOpen(v => !v);
  }

  async function onDeleteClick() {
    if (!deleteConfirming()) {
      setDeleteConfirming(true);
      deleteTimer = setTimeout(() => setDeleteConfirming(false), 3000);
      return;
    }
    if (deleteTimer) clearTimeout(deleteTimer);
    setDeleteConfirming(false);
    setMoreOpen(false);
    const photo = d();
    if (!photo) return;
    try {
      await deletePhotoAction(params.nick ?? '', photo.resource_id);
      navigate(`/photos/${params.nick ?? ''}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("photos.delete_error"));
    }
  }

  function openRename() {
    setRenameInput(d()?.filename ?? '');
    setRenameOpen(true);
    setMoreOpen(false);
  }

  async function handleRename(e: Event) {
    e.preventDefault();
    const name = renameInput().trim();
    if (!name || renaming()) return;
    setRenaming(true);
    try {
      await renamePhotoAction(params.nick ?? '', d()!.resource_id, name);
      setRenameOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("photos.rename_error"));
    } finally {
      setRenaming(false);
    }
  }

  async function startEdit() {
    const photo = d();
    if (!photo) return;
    try {
      const res  = await fetch(photo.src_full, { credentials: "include" });
      const blob = await res.blob();
      const file = new File([blob], photo.filename || "photo.jpg", {
        type: blob.type || "image/jpeg",
      });
      setEditFile(file);
    } catch {
      toast.error(t("photos.photo_error"));
    }
  }

  async function handleEditConfirm(blob: Blob) {
    setEditFile(null);
    const photo = d();
    if (!photo) return;
    setEditUploading(true);
    try {
      await uploadPhotoEdit(params.nick ?? "", photo.resource_id, blob);
      toast.success(t("photos.photo_saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("photos.photo_error"));
    } finally {
      setEditUploading(false);
    }
  }

  const prevPath    = () => d()?.prevlink?.replace(window.location.origin, '') ?? null;
  const nextPath    = () => d()?.nextlink?.replace(window.location.origin, '') ?? null;
  const photoMid    = () => d()?.item_mid ?? '';
  const profileUid  = () => auth()?.uid ?? 0;
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
      {/* Image editor overlay */}
      <Show when={editFile()}>
        {(file) => (
          <ImageEditor
            file={file()}
            onConfirm={handleEditConfirm}
            onCancel={() => setEditFile(null)}
          />
        )}
      </Show>

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

      {/* Card */}
      <div class="bg-surface border border-rim rounded-2xl overflow-hidden shadow-sm mb-4">

        {/* Image */}
        <div class="relative bg-overlay flex items-center justify-center min-h-48">
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

        {/* Content */}
        <div class="p-3 md:p-5">
          <Show when={d()?.description}>
            <p class="text-txt mb-2">{d()?.description}</p>
          </Show>
          <p class="text-xs text-muted">
            {d()?.filename}
            <Show when={d()?.created}>
              {' · '}{new Date(d()!.created).toLocaleString()}
            </Show>
          </p>

          {/* Action bar */}
          <div class="mt-4 pt-3 border-t border-rim flex items-center gap-1">
            {/* Like */}
            <button
              onClick={handleLike}
              title={t("post.like")}
              class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                     transition-colors select-none hover:bg-overlay
                     ${d()?.viewer_liked ? 'text-accent' : 'text-muted'}`}
            >
              <Show when={d()?.viewer_liked} fallback={<MdOutlineThumb_up size={17} />}>
                <MdFillThumb_up size={17} />
              </Show>
              <span>{d()?.like_count ?? 0}</span>
            </button>

            {/* Dislike */}
            <button
              onClick={handleDislike}
              title={t("post.dislike")}
              class={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                     transition-colors select-none hover:bg-overlay
                     ${d()?.viewer_disliked ? 'text-accent' : 'text-muted'}`}
            >
              <Show when={d()?.viewer_disliked} fallback={<MdOutlineThumb_down size={17} />}>
                <MdFillThumb_down size={17} />
              </Show>
              <span>{d()?.dislike_count ?? 0}</span>
            </button>

            {/* Comments toggle */}
            <Show when={commentCount() > 0}>
              <button
                onClick={() => setShowComments(v => !v)}
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                       text-muted hover:bg-overlay hover:text-txt transition-colors"
                title={t("post.toggle_comments")}
              >
                <Show when={showComments()} fallback={<MdFillKeyboard_arrow_down size={17} />}>
                  <MdFillKeyboard_arrow_up size={17} />
                </Show>
                <MdFillChat size={15} />
                <span>{commentCount()}</span>
              </button>
            </Show>

            {/* Thread / flat toggle */}
            <Show when={showComments() && hasNested()}>
              <button
                onClick={() => setThreaded(v => !v)}
                class="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium
                       text-muted hover:bg-overlay hover:text-txt transition-colors"
                title={threaded() ? t("photos.switch_flat") : t("photos.switch_threaded")}
              >
                <Show when={threaded()} fallback={<MdFillAccount_tree size={17} />}>
                  <MdFillFormat_list_bulleted size={17} />
                </Show>
              </button>
            </Show>

            {/* Reply — pushed to right */}
            <Show when={d()?.item_id}>
              <button
                onClick={() => setReplyOpen(v => !v)}
                class="ml-auto flex items-center px-2 py-1.5 rounded-lg text-sm font-medium
                       text-muted hover:bg-overlay hover:text-txt transition-colors"
                title={t("photos.comment")}
              >
                <MdOutlineReply size={17} />
              </button>
            </Show>

            {/* More dropdown */}
            <Show when={isOwner()}>
              <div ref={moreRef} class="relative">
                <button
                  onClick={openMoreDropdown}
                  title={t("post.more_actions")}
                  class={`flex items-center px-1.5 py-1.5 rounded-lg text-sm font-medium
                         transition-colors hover:bg-overlay
                         ${moreOpen() ? 'text-accent' : 'text-muted'}`}
                >
                  <MdFillMore_vert size={18} />
                </button>
              </div>
            </Show>
          </div>

          <Portal>
            <Show when={moreOpen() && moreAnchor()}>
              <div
                ref={morePortalRef}
                class="fixed z-[9999] min-w-[11rem] bg-surface border border-rim rounded-lg shadow-lg py-1"
                style={{ bottom: `${moreAnchor()!.bottom}px`, right: `${moreAnchor()!.right}px` }}
              >
                <button
                  onClick={() => { setMoreOpen(false); startEdit(); }}
                  disabled={editUploading()}
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt
                         hover:bg-overlay transition-colors text-left disabled:opacity-50"
                >
                  <Show when={editUploading()}
                    fallback={<MdOutlineEdit size={15} />}
                  >
                    <div class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </Show>
                  <span>{editUploading() ? t("photos.editing") : t("photos.edit_photo")}</span>
                </button>
                <button
                  onClick={openRename}
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt
                         hover:bg-overlay transition-colors text-left"
                >
                  <MdOutlineEdit size={15} class="opacity-60" />
                  <span>{t("photos.rename")}</span>
                </button>
                <button
                  onClick={() => { setMoreOpen(false); setAclOpen(v => !v); }}
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm text-txt
                         hover:bg-overlay transition-colors text-left"
                >
                  <MdOutlineLock size={15} />
                  <span>{t("photos.acl_privacy")}</span>
                </button>
                <button
                  onClick={onDeleteClick}
                  class={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-overlay
                         transition-colors text-left
                         ${deleteConfirming() ? 'text-red-500' : 'text-txt'}`}
                >
                  <MdOutlineDelete size={15} />
                  <span>{deleteConfirming() ? t("photos.confirm") : t("photos.delete_photo")}</span>
                </button>
              </div>
            </Show>
          </Portal>

          {/* ACL editor */}
          <Show when={aclOpen() && d()?.resource_id}>
            <AclEditor
              nick={params.nick ?? ''}
              type="image"
              datum={d()!.resource_id}
              onClose={() => setAclOpen(false)}
            />
          </Show>

          {/* Rename form */}
          <Show when={renameOpen()}>
            <form
              onSubmit={handleRename}
              class="mt-3 flex items-center gap-2 p-3 bg-overlay rounded-xl border border-rim"
            >
              <input
                type="text"
                value={renameInput()}
                onInput={e => setRenameInput(e.currentTarget.value)}
                placeholder={t("photos.rename_ph")}
                disabled={renaming()}
                autofocus
                class="flex-1 bg-transparent text-sm text-txt placeholder:text-muted
                       outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={renaming() || !renameInput().trim()}
                class="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium
                       transition-opacity disabled:opacity-40"
              >
                {renaming() ? t("photos.renaming") : t("photos.rename")}
              </button>
              <button
                type="button"
                onClick={() => setRenameOpen(false)}
                class="px-2 py-1.5 rounded-lg text-xs text-muted hover:text-txt transition-colors"
              >
                {t("photos.cancel")}
              </button>
            </form>
          </Show>

          {/* Reply composer */}
          <Show when={replyOpen() && d()?.item_id}>
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
                setReplyOpen(false);
                setShowComments(true);
              }}
            />
          </Show>

          {/* Comment thread */}
          <CommentThread
            comments={visibleComments()}
            show={showComments()}
            handlers={handlers}
          />
        </div>
      </div>
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
