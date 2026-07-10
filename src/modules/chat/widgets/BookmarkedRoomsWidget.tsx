// src/modules/chat/widgets/BookmarkedRoomsWidget.tsx
import { For, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { useI18n } from "@/i18n";
import { isLocalUser } from "@/shared/store/auth-store";
import {
  bookmarks,
  loading,
  loadChatBookmarks,
  removeChatBookmark,
} from "../bookmarks";

export default function BookmarkedRoomsWidget() {
  const { t } = useI18n();
  const navigate = useNavigate();

  onMount(loadChatBookmarks);

  function navigateTo(url: string) {
    try {
      navigate(new URL(url).pathname);
    } catch {
      navigate(url);
    }
  }

  return (
    <Show when={isLocalUser()}>
      <div class="bg-surface border border-rim rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div class="px-4 pt-3.5 pb-3 flex items-center gap-2">
          <svg class="w-4 h-4 text-accent shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2H5z" />
          </svg>
          <h3 class="text-sm font-semibold text-txt flex-1">{t("chat.bookmarked_rooms")}</h3>
          <Show when={!loading() && bookmarks().length > 0}>
            <span class="text-xs text-muted tabular-nums">{bookmarks().length}</span>
          </Show>
        </div>

        {/* Skeleton */}
        <Show when={loading()}>
          <div class="px-4 py-3 space-y-2 animate-pulse">
            <For each={[1, 2, 3]}>{() => <div class="h-3 bg-elevated rounded w-4/5" />}</For>
          </div>
        </Show>

        {/* Empty */}
        <Show when={!loading() && bookmarks().length === 0}>
          <p class="px-4 py-6 text-xs text-muted text-center">{t("chat.no_bookmarks")}</p>
        </Show>

        {/* List */}
        <div class="divide-y divide-rim">
          <For each={bookmarks()}>
            {(bm) => (
              <div class="flex items-center gap-2 px-3 py-2.5 hover:bg-elevated group transition-colors">
                <button
                  class="flex-1 text-left text-xs text-txt truncate hover:text-accent transition-colors"
                  onClick={() => navigateTo(bm.url)}
                >
                  {bm.title}
                </button>
                <button
                  onClick={() => void removeChatBookmark(bm.id)}
                  class="opacity-0 group-hover:opacity-100 p-1 rounded text-muted hover:text-red-500 transition-all shrink-0"
                  title={t("chat.unbookmark") as string}
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  );
}
