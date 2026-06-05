import { createSignal, For, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { storageGet, storageSet, storageDel, storageKeys } from "@/shared/lib/storage";
import type { SavedDraft } from "@/shared/editor/store/createComposerStore";
import PostComposer from "@/shared/editor/composers/PostComposer";
import { useAuth } from "@/shared/store/auth-store";
import { useI18n } from "@/i18n";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeScopeLabel(t: (key: string) => string) {
  return function scopeLabel(scope: string): string {
    if (scope === "post:new") return t("hq.draft_new_post");
    if (scope === "article:new") return t("hq.draft_new_article");
    if (scope.startsWith("post:reply:")) return t("hq.draft_reply");
    if (scope.startsWith("article:edit:")) return t("hq.draft_article");
    return t("hq.draft_label");
  };
}

function isPostScope(scope: string): boolean {
  return scope === "post:new" || scope.startsWith("post:reply:");
}

function isArticleNewScope(scope: string): boolean {
  return scope === "article:new";
}

function makeTimeAgo(t: (key: string) => string) {
  return function timeAgo(ms: number): string {
    const diff = Date.now() - ms;
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return t("hq.just_now");
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };
}

type DraftEntry = { scope: string; draft: SavedDraft };

// ── Skeleton ──────────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <div class="px-4 py-3 flex items-start gap-3 animate-pulse">
    <div class="h-4 w-16 rounded bg-overlay shrink-0 mt-0.5" />
    <div class="flex-1 space-y-1.5">
      <div class="h-3 bg-overlay rounded w-4/5" />
      <div class="h-3 bg-overlay rounded w-2/5" />
    </div>
  </div>
);

// ── Widget ────────────────────────────────────────────────────────────────────

export default function DraftsWidget() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const scopeLabel = makeScopeLabel(t as (key: string) => string);
  const timeAgo = makeTimeAgo(t as (key: string) => string);
  const [entries, setEntries] = createSignal<DraftEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [activeEntry, setActiveEntry] = createSignal<DraftEntry | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const allKeys = await storageKeys();
      const draftKeys = allKeys.filter((k) => k.startsWith("drafts-list:"));
      const results: DraftEntry[] = [];
      await Promise.all(
        draftKeys.map(async (key) => {
          const scope = key.slice("drafts-list:".length);
          const drafts = await storageGet<SavedDraft[]>(key, []);
          for (const draft of drafts) results.push({ scope, draft });
        }),
      );
      results.sort((a, b) => b.draft.updated - a.draft.updated);
      setEntries(results);
    } finally {
      setLoading(false);
    }
  }

  onMount(loadAll);

  async function deleteDraft(scope: string, id: string) {
    const key = `drafts-list:${scope}`;
    const current = await storageGet<SavedDraft[]>(key, []);
    const updated = current.filter((d) => d.id !== id);
    if (updated.length > 0) await storageSet(key, updated);
    else await storageDel(key);
    setEntries((prev) => prev.filter((e) => !(e.scope === scope && e.draft.id === id)));
  }

  async function loadArticleDraft(entry: DraftEntry) {
    await storageSet(`pending-draft:${entry.scope}`, entry.draft);
    const nick = auth()?.nick;
    navigate(`/articles/${nick ?? ""}?new=1`);
  }

  function handleLoad(entry: DraftEntry) {
    if (isPostScope(entry.scope)) { setActiveEntry(entry); return; }
    if (isArticleNewScope(entry.scope)) { void loadArticleDraft(entry); }
  }

  return (
    <>
      <div class="bg-surface border border-rim rounded-2xl shadow-sm flex flex-col overflow-hidden">

        {/* Header */}
        <div class="px-4 pt-3.5 pb-3 flex items-center justify-between border-b border-rim shrink-0">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                d="M15 3v5H9V3m0 14h6" />
            </svg>
            <h3 class="text-sm font-semibold text-txt">{t("hq.drafts")}</h3>
          </div>
          <Show when={!loading() && entries().length > 0}>
            <span class="text-xs text-muted tabular-nums">{entries().length}</span>
          </Show>
        </div>

        {/* Body */}
        <Show when={loading()}>
          <For each={[1, 2, 3]}>{() => <SkeletonRow />}</For>
        </Show>

        <Show when={!loading() && entries().length === 0}>
          <div class="px-4 py-8 flex flex-col items-center gap-2 text-muted">
            <svg class="w-8 h-8 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M15 3v5H9V3m0 14h6" />
            </svg>
            <span class="text-xs">{t("hq.no_drafts")}</span>
          </div>
        </Show>

        <div class="divide-y divide-rim">
          <For each={entries()}>
            {(entry) => (
              <div class="flex items-start gap-3 px-4 py-3 hover:bg-elevated group transition-colors">

                {/* Scope badge */}
                <span class="mt-0.5 shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded
                              bg-elevated text-muted border border-rim">
                  {scopeLabel(entry.scope)}
                </span>

                {/* Content — click to load if loadable scope */}
                <div
                  class={
                    "flex-1 min-w-0 " +
                    (isPostScope(entry.scope) || isArticleNewScope(entry.scope)
                      ? "cursor-pointer"
                      : "")
                  }
                  onClick={() => handleLoad(entry)}
                >
                  <Show when={entry.draft.title}>
                    <p class="text-xs font-medium text-txt truncate leading-snug">
                      {entry.draft.title}
                    </p>
                  </Show>
                  <p class="text-xs text-muted truncate">
                    <Show when={entry.draft.preview} fallback={<em>{t("hq.empty_draft")}</em>}>
                      {entry.draft.preview}
                    </Show>
                  </p>
                  <p class="text-[10px] text-muted/60 mt-0.5">
                    {timeAgo(entry.draft.updated)}
                  </p>
                </div>

                {/* Actions */}
                <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Show when={isPostScope(entry.scope) || isArticleNewScope(entry.scope)}>
                    <button
                      type="button"
                      title={t("hq.load_in_composer")}
                      onClick={() => handleLoad(entry)}
                      class="px-2 py-0.5 text-[10px] rounded border border-rim text-muted
                             hover:text-txt hover:border-rim-strong transition-colors"
                    >
                      {t("hq.load")}
                    </button>
                  </Show>
                  <button
                    type="button"
                    title={t("hq.delete_draft")}
                    onClick={() => void deleteDraft(entry.scope, entry.draft.id)}
                    class="p-1 rounded text-muted hover:text-red-500 transition-colors"
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

      {/* Post composer — opened when loading a post draft */}
      <Show when={activeEntry() !== null && !auth.loading && auth()?.uid}>
        <PostComposer
          profileUid={auth()!.uid}
          open={true}
          initialBody={activeEntry()!.draft.body}
          onPosted={() => {
            void deleteDraft(activeEntry()!.scope, activeEntry()!.draft.id);
            setActiveEntry(null);
          }}
          onClose={() => setActiveEntry(null)}
        />
      </Show>
    </>
  );
}
