import {
  createSignal,
  createResource,
  Show,
  For,
  type Component,
} from "solid-js";
import { fetchAlbums, fetchPhotoAlbum } from "@/modules/photos/api/api";
import type { Photo, Album } from "@/modules/photos/api/api";

interface Props {
  nick: string;
  selected: () => Set<string>;
  onToggle: (photo: Photo) => void;
}

const PhotosPicker: Component<Props> = (props) => {
  const [currentAlbum, setCurrentAlbum] = createSignal<Album | null>(null);

  const [albums] = createResource(() => props.nick, fetchAlbums);

  const [albumPhotos] = createResource(
    () => {
      const a = currentAlbum();
      return a ? { nick: props.nick, folder: a.folder } : null;
    },
    (p) => (p ? fetchPhotoAlbum(p.nick, p.folder) : null),
  );

  return (
    <div class="flex flex-col h-full min-h-0">
      {/* Breadcrumb */}
      <div class="flex items-center gap-1.5 px-1 pb-3 text-sm">
        <button
          type="button"
          onClick={() => setCurrentAlbum(null)}
          class={
            "hover:text-txt transition-colors " +
            (currentAlbum() ? "text-accent" : "text-txt font-medium")
          }
        >
          Photos
        </button>
        <Show when={currentAlbum()}>
          <span class="text-muted">/</span>
          <span class="text-txt font-medium truncate">{currentAlbum()!.album}</span>
        </Show>
      </div>

      {/* Content */}
      <div class="flex-1 overflow-y-auto min-h-0">
        <Show when={!currentAlbum()}>
          {/* Albums grid */}
          <Show
            when={!albums.loading}
            fallback={<GridSkeleton count={6} />}
          >
            <Show
              when={(albums() ?? []).length > 0}
              fallback={<EmptyState label="No albums found" />}
            >
              <div class="grid grid-cols-3 gap-2">
                <For each={albums()}>
                  {(album) => (
                    <button
                      type="button"
                      onClick={() => setCurrentAlbum(album)}
                      class="flex flex-col rounded-lg overflow-hidden border border-rim
                             hover:border-accent/60 transition-colors bg-surface group"
                    >
                      <div class="aspect-square bg-elevated overflow-hidden">
                        <Show
                          when={album.thumb}
                          fallback={<AlbumPlaceholder />}
                        >
                          <img
                            src={album.thumb!}
                            alt={album.album}
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </Show>
                      </div>
                      <div class="px-2 py-1.5 text-left">
                        <p class="text-xs font-medium text-txt truncate">{album.album}</p>
                        <p class="text-[10px] text-muted">{album.total} photos</p>
                      </div>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Show>

        <Show when={currentAlbum()}>
          {/* Photos in album */}
          <Show
            when={!albumPhotos.loading}
            fallback={<GridSkeleton count={9} />}
          >
            <Show
              when={(albumPhotos()?.photos ?? []).length > 0}
              fallback={<EmptyState label="No photos in this album" />}
            >
              <div class="grid grid-cols-3 gap-2">
                <For each={albumPhotos()?.photos ?? []}>
                  {(photo) => {
                    const isSelected = () => props.selected().has(photo.resource_id);
                    return (
                      <button
                        type="button"
                        onClick={() => props.onToggle(photo)}
                        class={
                          "relative aspect-square rounded-lg overflow-hidden border-2 transition-all " +
                          (isSelected()
                            ? "border-accent shadow-md shadow-accent/20 scale-[0.97]"
                            : "border-transparent hover:border-rim")
                        }
                      >
                        <img
                          src={photo.src}
                          alt={photo.filename}
                          class="w-full h-full object-cover"
                        />
                        <Show when={isSelected()}>
                          <div class="absolute inset-0 bg-accent/20 flex items-center justify-center">
                            <div class="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                              <svg class="w-3.5 h-3.5 text-accent-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        </Show>
                      </button>
                    );
                  }}
                </For>
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
};

export default PhotosPicker;

// ── Helpers ───────────────────────────────────────────────────────────────────

function GridSkeleton(props: { count: number }) {
  return (
    <div class="grid grid-cols-3 gap-2">
      <For each={Array.from({ length: props.count })}>
        {() => (
          <div class="aspect-square rounded-lg bg-elevated animate-pulse" />
        )}
      </For>
    </div>
  );
}

function AlbumPlaceholder() {
  return (
    <div class="w-full h-full flex items-center justify-center bg-elevated">
      <svg class="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function EmptyState(props: { label: string }) {
  return (
    <div class="flex flex-col items-center justify-center py-12 text-muted">
      <svg class="w-10 h-10 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="text-sm">{props.label}</p>
    </div>
  );
}
