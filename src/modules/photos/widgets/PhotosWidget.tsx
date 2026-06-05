import { createEffect, Show, For } from "solid-js";
import { A, useParams } from "@solidjs/router";
import { MdFillPhoto_library, MdFillImage } from "solid-icons/md";
import {
  recentPhotos, albums, albumsLoading,
  loadRecentPhotos, loadAlbums,
} from "../store/store";
import { useI18n } from "@/i18n";

export default function PhotosWidget() {
  const params = useParams<{ nick?: string }>();
  const { t } = useI18n();
  const nick   = () => params.nick ?? '';

  createEffect(() => {
    if (!nick()) return;
    loadRecentPhotos(nick());
    loadAlbums(nick());
  });

  return (
    <div class="space-y-4">

      {/* Recent photos strip */}
      <Show when={recentPhotos().length > 0}>
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1">
              <MdFillImage size={13} /> {t("photos.recent")}
            </span>
            <A
              href={`/photos/${nick()}`}
              class="text-xs text-accent hover:underline"
            >
              {t("photos.see_all")}
            </A>
          </div>
          <div class="grid grid-cols-4 gap-1">
            <For each={recentPhotos().slice(0, 8)}>
              {(photo) => (
                <A
                  href={`/photos/${nick()}/image/${photo.resource_id}`}
                  class="aspect-square rounded-lg overflow-hidden bg-surface block"
                >
                  <img
                    src={photo.src}
                    alt={photo.filename}
                    loading="lazy"
                    class="w-full h-full object-cover hover:scale-105
                           transition-transform duration-200"
                  />
                </A>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Album list */}
      <Show when={!albumsLoading() && albums().length > 0}>
        <div>
          <span class="text-xs font-semibold text-muted uppercase tracking-wide flex items-center gap-1 mb-2">
            <MdFillPhoto_library size={13} /> {t("photos.albums")}
          </span>
          <div class="space-y-1">
            <For each={albums()}>
              {(album) => (
                <A
                  href={`/photos/${nick()}/album/${album.folder}`}
                  class="flex items-center gap-2.5 p-2 rounded-lg
                         hover:bg-elevated transition-colors group"
                >
                  <Show
                    when={album.thumb}
                    fallback={
                      <div class="w-9 h-9 rounded-md bg-surface flex items-center justify-center shrink-0">
                        <MdFillPhoto_library size={16} class="text-subtle" />
                      </div>
                    }
                  >
                    <img
                      src={album.thumb!}
                      alt={album.album}
                      class="w-9 h-9 rounded-md object-cover shrink-0"
                    />
                  </Show>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-txt truncate group-hover:text-accent transition-colors">
                      {album.album}
                    </p>
                    <p class="text-xs text-muted">{album.total} {t("photos.photos_count")}</p>
                  </div>
                </A>
              )}
            </For>
          </div>
        </div>
      </Show>

      <Show when={albumsLoading()}>
        <div class="space-y-2">
          <For each={Array(3).fill(0)}>
            {() => (
              <div class="flex items-center gap-2.5 p-2">
                <div class="w-9 h-9 rounded-md bg-surface animate-pulse shrink-0" />
                <div class="flex-1 space-y-1">
                  <div class="h-3 bg-surface rounded animate-pulse w-3/4" />
                  <div class="h-2.5 bg-elevated rounded animate-pulse w-1/4" />
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

    </div>
  );
}
