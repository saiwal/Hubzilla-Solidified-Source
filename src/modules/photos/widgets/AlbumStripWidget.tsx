// Photo album strip (config: { album }): the album's latest thumbnails in a
// small grid, linking into the gallery. multiInstance.

import { createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import type { WidgetProps } from "@/shared/types/module.types";
import { usePageNick } from "@/shared/store/site-config";
import { editingWidgets } from "@/shared/store/widget-layout";
import { useI18n } from "@/i18n";
import { fetchPhotoAlbum } from "../api/api";

const MAX_THUMBS = 6;

function EditHint(props: { text: string }) {
  return (
    <Show when={editingWidgets()}>
      <div class="bg-surface border border-rim rounded-xl px-4 py-3">
        <p class="text-xs text-muted">{props.text}</p>
      </div>
    </Show>
  );
}

export default function AlbumStripWidget(props: WidgetProps) {
  const { t } = useI18n();
  const nick = usePageNick();
  const album = () => String(props.config?.album ?? "");

  const [data] = createResource(
    () => (nick() && album() ? { nick: nick(), album: album() } : null),
    (p) => fetchPhotoAlbum(p.nick, p.album),
  );

  return (
    <Show when={album()} fallback={<EditHint text={t("widgets.not_configured")} />}>
      <Show when={data.loading}>
        <div class="bg-surface border border-rim rounded-xl p-3 animate-pulse">
          <div class="h-3 bg-elevated rounded w-1/2 mb-2" />
          <div class="grid grid-cols-3 gap-1">
            <For each={Array.from({ length: 6 })}>
              {() => <div class="aspect-square bg-elevated rounded" />}
            </For>
          </div>
        </div>
      </Show>

      <Show when={!data.loading}>
        <Show
          when={(data()?.photos.length ?? 0) > 0}
          fallback={<EditHint text={t("widgets.item_unavailable")} />}
        >
          <div class="bg-surface border border-rim rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b border-rim">
              <h3 class="text-sm font-semibold text-txt truncate">
                {data()!.album_name || t("widgets.album_strip")}
              </h3>
            </div>
            <div class="p-2 grid grid-cols-3 gap-1">
              <For each={data()!.photos.slice(0, MAX_THUMBS)}>
                {(photo) => (
                  <A href={`/photos/${nick()}/image/${photo.resource_id}`}>
                    <img
                      src={photo.src}
                      alt={photo.title || photo.filename}
                      class="aspect-square w-full object-cover rounded hover:opacity-80 transition-opacity"
                      loading="lazy"
                    />
                  </A>
                )}
              </For>
            </div>
            <A
              href={`/photos/${nick()}/album/${album()}`}
              class="block px-4 py-2 border-t border-rim text-center text-xs font-medium
                     text-accent hover:bg-elevated transition-colors"
            >
              {t("widgets.view_album")}
            </A>
          </div>
        </Show>
      </Show>
    </Show>
  );
}
