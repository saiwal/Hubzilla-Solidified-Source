import { createSignal, For, Show, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { storageSet, storageDel } from "@/shared/lib/storage";
import type { SavedDraft } from "@/shared/editor/store/createComposerStore";
import { listServerDrafts, deleteServerDraft } from "@/shared/editor/api/drafts";
import PostComposer from "@/shared/editor/composers/PostComposer";
import { useAuth } from "@/shared/store/auth-store";
import { useI18n } from "@/i18n";

// ── Scope helpers ─────────────────────────────────────────────────────────────

function scopeParts(scope: string): { type: string; action: string; id: string } {
  const [type = "", action = "", ...rest] = scope.split(":");
  return { type, action, id: rest.join(":") };
}

function isLoadable(scope: string): boolean {
  const { type, action } = scopeParts(scope);
  if (type === "post" && action === "new") return true;
  if (type === "article" && (action === "new" || action === "edit")) return true;
  return false;
}

// Badge colour per content type
const TYPE_BADGE: Record<string, string> = {
  post:    "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  article: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  comment: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  webpage: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25",
  wiki:    "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25",
  event:   "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
};
const DEFAULT_BADGE = "bg-elevated text-muted border-rim";

function badgeClass(scope: string): string {
  return TYPE_BADGE[scopeParts(scope).type] ?? DEFAULT_BADGE;
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
    return `${Math.floor(hours / 24)}d ago`;
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
  const timeAgo = makeTimeAgo(t as (key: string) => string);

  const [entries, setEntries] = createSignal<DraftEntry[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [activeEntry, setActiveEntry] = createSignal<DraftEntry | null>(null);
  const [deleting, setDeleting] = createSignal<string | null>(null);

  // Reactive label — called in JSX so Solid tracks t() reads
  function scopeLabel(scope: string): string {
    const { type, action } = scopeParts(scope);
    if (action === "new") {
      if (type === "post")    return t("hq.draft_new_post");
      if (type === "article") return t("hq.draft_new_article");
      if (type === "webpage") return t("hq.draft_new_webpage");
      if (type === "wiki")    return t("hq.draft_new_wiki");
      if (type === "event")   return t("hq.draft_new_event");
    }
    if (action === "reply") return t("hq.draft_reply");
    if (type === "comment") return t("hq.draft_comment");
    if (type === "article") return t("hq.draft_article");
    if (type === "webpage") return t("hq.draft_webpage");
    if (type === "wiki")    return t("hq.draft_wiki");
    if (type === "event")   return t("hq.draft_event");
    return t("hq.draft_label");
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true);
    try {
      const serverDrafts = await listServerDrafts();
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
    const { type, action, id: uuid } = scopeParts(entry.scope);
    const nick = auth()?.nick ?? "";

    // Always write a pending-draft so the target composer restores ALL fields
    await storageSet(`pending-draft:${entry.scope}`, entry.draft);

    if (type === "post" && action === "new") {
      setActiveEntry(entry);
      return;
    }

    if (type === "article") {
      if (action === "new") {
        navigate(`/articles/${nick}?new=1`);
      } else if (action === "edit" && uuid) {
        // Navigate to the article — pending-draft loads when user opens the editor
        navigate(`/articles/${nick}/${uuid}`);
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
          <div class="flex items-center gap-2">
            <Show when={!loading() && entries().length > 0}>
              <span class="text-xs text-muted tabular-nums">{entries().length}</span>
            </Show>
            {/* Refresh */}
            <button
              type="button"
              title={t("hq.retry")}
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
          <For each={[1, 2, 3]}>{() => <SkeletonRow />}</For>
        </Show>

        {/* Empty state */}
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

        {/* Draft list */}
        <Show when={!loading()}>
          <div class="divide-y divide-rim">
            <For each={entries()}>
              {(entry) => {
                const loadable = () => isLoadable(entry.scope);
                const isDeleting = () => deleting() === entry.draft.id;

                return (
                  <div class="flex items-start gap-3 px-4 py-3 hover:bg-elevated group transition-colors"
                    classList={{ "opacity-50 pointer-events-none": isDeleting() }}>

                    {/* Type badge */}
                    <span class={`mt-0.5 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded
                                  border leading-none select-none ${badgeClass(entry.scope)}`}>
                      {scopeLabel(entry.scope)}
                    </span>

                    {/* Content */}
                    <div
                      class={`flex-1 min-w-0 ${loadable() ? "cursor-pointer" : ""}`}
                      onClick={() => { if (loadable()) void handleLoad(entry); }}
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
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="text-[10px] text-muted/60">{timeAgo(entry.draft.updated)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Show when={loadable()}>
                        <button
                          type="button"
                          title={t("hq.load_in_composer")}
                          onClick={() => void handleLoad(entry)}
                          class="px-2 py-0.5 text-[10px] rounded border border-rim text-muted
                                 hover:text-txt hover:border-rim-strong transition-colors"
                        >
                          {t("hq.load")}
                        </button>
                      </Show>
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
                          {t("hq.delete_draft")}
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

      {/* Post composer — opened when loading a post:new draft */}
      <Show when={activeEntry() !== null && !auth.loading && auth()?.uid}>
        <PostComposer
          profileUid={auth()!.uid}
          open={true}
          onPosted={() => {
            void deleteDraft(activeEntry()!.scope, activeEntry()!.draft.id);
            setActiveEntry(null);
          }}
          onClose={() => {
            void storageDel(`pending-draft:${activeEntry()!.scope}`);
            setActiveEntry(null);
          }}
        />
      </Show>
    </>
  );
}
