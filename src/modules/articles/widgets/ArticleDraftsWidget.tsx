import { createSignal, For, Show, onMount } from "solid-js";
import { storageSet, storageDel } from "@/shared/lib/storage";
import type { SavedDraft } from "@/shared/editor/store/createComposerStore";
import { listServerDrafts, deleteServerDraft } from "@/shared/editor/api/drafts";
import ArticleComposerModal from "@/shared/editor/composers/ArticleComposerModal";
import { useAuth } from "@/shared/store/auth-store";
import { useViewerRole, usePageNick } from "@/shared/store/site-config";
import { useI18n } from "@/i18n";
import { resetPosts, loadArticles } from "../store";

// ── Scope helpers ─────────────────────────────────────────────────────────────
// Article drafts carry scope "article:new" or "article:edit:<uuid>"

function scopeParts(scope: string): { action: string; uuid: string } {
  const [, action = "", ...rest] = scope.split(":");
  return { action, uuid: rest.join(":") };
}

function makeTimeAgo(t: (key: string) => string) {
  return function timeAgo(ms: number): string {
    const diff = Date.now() - ms;
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return t("articles.just_now");
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };
}

type DraftEntry = { scope: string; draft: SavedDraft };

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <div class="px-4 py-3 flex items-start gap-3 animate-pulse">
    <div class="h-4 w-10 rounded bg-overlay shrink-0 mt-0.5" />
    <div class="flex-1 space-y-1.5">
      <div class="h-3 bg-overlay rounded w-4/5" />
      <div class="h-3 bg-overlay rounded w-2/5" />
    </div>
  </div>
);

// ── Widget ────────────────────────────────────────────────────────────────────

export default function ArticleDraftsWidget() {
  const auth = useAuth();
  const role = useViewerRole();
  const pageNick = usePageNick();
  const { t } = useI18n();
  const timeAgo = makeTimeAgo(t as (key: string) => string);

  const [entries, setEntries] = createSignal<DraftEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [activeEntry, setActiveEntry] = createSignal<DraftEntry | null>(null);
  const [deleting, setDeleting] = createSignal<string | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true);
    try {
      const serverDrafts = await listServerDrafts("article");
      const results = serverDrafts.map((sd) => ({
        scope: sd.scope,
        draft: { ...sd, id: sd.serverMid },
      }));
      results.sort((a, b) => b.draft.updated - a.draft.updated);
      setEntries(results);
    } finally {
      setLoading(false);
    }
  }

  onMount(loadAll);

  // ── Delete ────────────────────────────────────────────────────────────────

  async function deleteDraft(scope: string, id: string) {
    setDeleting(id);
    try {
      void deleteServerDraft(id); // id === serverMid for server-only drafts
      setEntries((prev) => prev.filter((e) => !(e.scope === scope && e.draft.id === id)));
    } finally {
      setDeleting(null);
    }
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  async function handleLoad(entry: DraftEntry) {
    // Pending-draft is picked up by the composer store on mount (and sets
    // loadedDraftId, which auto-deletes the draft on publish)
    await storageSet(`pending-draft:${entry.scope}`, entry.draft);
    setActiveEntry(entry);
  }

  // For edit drafts the composer needs the article uuid (it posts to
  // /api/item/:uuid/edit); field values come from the draft itself
  function articleInitial() {
    const entry = activeEntry();
    if (!entry) return undefined;
    const { action, uuid } = scopeParts(entry.scope);
    if (action !== "edit" || !uuid) return undefined;
    const d = entry.draft;
    return {
      uuid,
      title: d.title,
      summary: d.summary,
      slug: d.slug,
      category: d.category,
      body: d.body,
    };
  }

  return (
    <Show when={role() === "owner" && !auth.loading && auth()?.uid}>
      <div class="bg-surface border border-rim rounded-2xl shadow-sm flex flex-col overflow-hidden">

        {/* Header */}
        <div class="px-4 pt-3.5 pb-3 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M15 3v5H9V3m0 14h6" />
            </svg>
            <h3 class="text-sm font-semibold text-txt">{t("articles.drafts")}</h3>
          </div>
          <div class="flex items-center gap-2">
            <Show when={!loading() && entries().length > 0}>
              <span class="text-xs text-muted tabular-nums">{entries().length}</span>
            </Show>
            {/* Refresh */}
            <button
              type="button"
              title={t("articles.refresh_drafts")}
              onClick={loadAll}
              disabled={loading()}
              class="p-0.5 rounded text-muted hover:text-txt transition-colors disabled:opacity-40"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                classList={{ "animate-spin": loading() }}>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003
                     8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Loading skeletons */}
        <Show when={loading()}>
          <For each={[1, 2]}>{() => <SkeletonRow />}</For>
        </Show>

        {/* Empty state */}
        <Show when={!loading() && entries().length === 0}>
          <div class="px-4 py-6 flex flex-col items-center gap-2 text-muted">
            <svg class="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M15 3v5H9V3m0 14h6" />
            </svg>
            <span class="text-xs">{t("articles.no_drafts")}</span>
          </div>
        </Show>

        {/* Draft list */}
        <Show when={!loading()}>
          <div class="divide-y divide-rim">
            <For each={entries()}>
              {(entry) => {
                const isDeleting = () => deleting() === entry.draft.id;
                const isEdit = () => scopeParts(entry.scope).action === "edit";

                return (
                  <div class="flex items-start gap-3 px-4 py-3 hover:bg-elevated group transition-colors"
                    classList={{ "opacity-50 pointer-events-none": isDeleting() }}>

                    {/* Type badge */}
                    <span class="mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded
                                 border leading-none select-none bg-emerald-500/10 text-emerald-600
                                 dark:text-emerald-400 border-emerald-500/25">
                      {isEdit() ? t("articles.draft_edit") : t("articles.draft_new")}
                    </span>

                    {/* Content */}
                    <div
                      class="flex-1 min-w-0 cursor-pointer"
                      onClick={() => void handleLoad(entry)}
                    >
                      <Show when={entry.draft.title}>
                        <p class="text-xs font-medium text-txt truncate leading-snug">
                          {entry.draft.title}
                        </p>
                      </Show>
                      <p class="text-xs text-muted truncate">
                        <Show when={entry.draft.preview} fallback={<em>{t("articles.empty_draft")}</em>}>
                          {entry.draft.preview}
                        </Show>
                      </p>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="text-[10px] text-muted/60">{timeAgo(entry.draft.updated)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title={t("articles.load_draft")}
                        onClick={() => void handleLoad(entry)}
                        class="px-2 py-0.5 text-[10px] rounded border border-rim text-muted
                               hover:text-txt hover:border-rim-strong transition-colors"
                      >
                        {t("articles.load_draft")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDraft(entry.scope, entry.draft.id)}
                        class="px-2 py-0.5 text-[10px] rounded border border-rim text-muted
                               hover:text-red-500 hover:border-red-400/50 transition-colors
                               flex items-center gap-1"
                      >
                        <Show
                          when={!isDeleting()}
                          fallback={
                            <svg class="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0
                                   0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          }
                        >
                          {t("articles.delete_draft")}
                        </Show>
                      </button>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </Show>
      </div>

      {/* Article composer — opened when loading a draft */}
      <Show when={activeEntry() !== null}>
        <ArticleComposerModal
          uid={auth()!.uid}
          nick={pageNick()}
          heading={articleInitial() ? t("articles.edit_article") : t("articles.new_article")}
          initial={articleInitial()}
          onClose={() => {
            void storageDel(`pending-draft:${activeEntry()!.scope}`);
            setActiveEntry(null);
          }}
          onSaved={() => {
            setActiveEntry(null);
            void loadAll();
            resetPosts();
            void loadArticles(pageNick());
          }}
        />
      </Show>
    </Show>
  );
}
