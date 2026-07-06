// src/modules/bookmarks/views/BookmarksView.tsx
import { For, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { createQueryResource } from "@/shared/lib/createQueryResource";
import { useI18n } from "@/i18n";
import { fetchAllBookmarks, deleteBookmark, type BookmarkMenu, type BookmarkItem } from "../api";
import { resetChatBookmarks } from "@/modules/chat/bookmarks";

export default function BookmarksView() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [menus, { mutate }] = createQueryResource<BookmarkMenu[]>("bookmarks", fetchAllBookmarks, {
    initialValue: [],
  });

  async function remove(item: BookmarkItem) {
    await deleteBookmark(item.id);
    // Optimistically remove from list
    mutate((prev) =>
      (prev ?? []).map((menu) => ({
        ...menu,
        items: menu.items.filter((i) => i.id !== item.id),
      })).filter((menu) => menu.items.length > 0)
    );
    // Invalidate chat bookmarks cache so widget refreshes
    resetChatBookmarks();
  }

  function visit(url: string) {
    try {
      const u = new URL(url);
      if (u.origin === window.location.origin) {
        navigate(u.pathname);
        return;
      }
    } catch { /* fall through */ }
    window.open(url, "_blank", "noopener");
  }

  const totalCount = () => (menus() ?? []).reduce((s, m) => s + m.items.length, 0);

  return (
    <div class="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* Page header */}
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-accent shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
        </svg>
        <h1 class="text-lg font-semibold text-txt">{t("bookmarks.title")}</h1>
        <Show when={!menus.loading && totalCount() > 0}>
          <span class="text-xs text-muted tabular-nums ml-auto">{totalCount()}</span>
        </Show>
      </div>

      {/* Loading skeleton */}
      <Show when={menus.loading}>
        <div class="space-y-4">
          <For each={[1, 2]}>{() => (
            <div class="bg-surface border border-rim rounded-2xl overflow-hidden animate-pulse">
              <div class="px-4 py-3 border-b border-rim">
                <div class="h-3.5 bg-elevated rounded w-32" />
              </div>
              <div class="divide-y divide-rim">
                <For each={[1, 2, 3]}>{() => (
                  <div class="px-4 py-3 flex items-center gap-3">
                    <div class="h-3 bg-elevated rounded flex-1" />
                    <div class="h-3 bg-elevated rounded w-16" />
                  </div>
                )}</For>
              </div>
            </div>
          )}</For>
        </div>
      </Show>

      {/* Empty state */}
      <Show when={!menus.loading && totalCount() === 0}>
        <div class="flex flex-col items-center gap-3 py-16 text-muted">
          <svg class="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
          </svg>
          <p class="text-sm font-medium">{t("bookmarks.no_bookmarks")}</p>
          <p class="text-xs text-center max-w-xs">{t("bookmarks.no_bookmarks_desc")}</p>
        </div>
      </Show>

      {/* Bookmark folders */}
      <For each={menus()}>
        {(menu) => (
          <div class="bg-surface border border-rim rounded-2xl overflow-hidden shadow-sm">
            {/* Folder header */}
            <div class="px-4 py-3 border-b border-rim flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
              </svg>
              <span class="text-xs font-semibold text-txt">
                {menu.name || t("bookmarks.untitled_folder")}
              </span>
              <span class="ml-auto text-xs text-muted tabular-nums">{menu.items.length}</span>
            </div>

            {/* Items */}
            <div class="divide-y divide-rim">
              <For each={menu.items}>
                {(item) => (
                  <div class="flex items-center gap-3 px-4 py-3 hover:bg-elevated group transition-colors">
                    {/* Chat badge */}
                    <Show when={item.is_chat}>
                      <span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded
                                   bg-accent/10 text-accent border border-accent/20">
                        {t("bookmarks.chat_badge")}
                      </span>
                    </Show>

                    {/* Title */}
                    <button
                      class="flex-1 text-left text-sm text-txt truncate hover:text-accent transition-colors"
                      onClick={() => visit(item.url)}
                    >
                      {item.title}
                    </button>

                    {/* Actions */}
                    <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => visit(item.url)}
                        class="text-[10px] px-2 py-0.5 rounded border border-rim text-muted
                               hover:text-txt hover:border-rim-strong transition-colors"
                      >
                        {t("bookmarks.visit")}
                      </button>
                      <button
                        onClick={() => void remove(item)}
                        class="p-1 rounded text-muted hover:text-red-500 transition-colors"
                        title={t("bookmarks.remove") as string}
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}
