// src/modules/wiki/views/WikiPageView.tsx
import {
  createEffect, createSignal, Show, For, onCleanup,
} from "solid-js";
import { useParams, A, useNavigate } from "@solidjs/router";
import DOMPurify from "dompurify";
import {
  pageData, pageLoading, editMode, draftContent, canWrite,
  pages, currentWiki, pagesLoading,
  loadPage, loadWikiPages, toggleEditMode, updateDraft, resetPage,
} from "../store";
import { savePage, deletePage } from "../api";

export default function WikiPageView() {
  const params   = useParams<{ nick: string; wikiName: string; pageName: string }>();
  const navigate = useNavigate();
  const [saving, setSaving]         = createSignal(false);
  const [deleting, setDeleting]     = createSignal(false);
  const [commitMsg, setCommitMsg]   = createSignal("");
  const [saveError, setSaveError]   = createSignal("");
  const [confirmDel, setConfirmDel] = createSignal(false);

  createEffect(() => {
    const { nick, wikiName, pageName } = params;
    if (!nick || !wikiName || !pageName) return;
    loadPage(nick, wikiName, pageName);
    if (!currentWiki() || currentWiki()!.url_name !== wikiName) {
      loadWikiPages(nick, wikiName);
    }
  });

  onCleanup(() => resetPage());

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      await savePage(
        params.nick,
        params.wikiName,
        params.pageName,
        { content: draftContent(), commit_msg: commitMsg(), mime_type: pageData()?.page.mime_type },
      );
      setCommitMsg("");
      toggleEditMode();
      loadPage(params.nick, params.wikiName, params.pageName);
    } catch (e: any) {
      setSaveError(e.message ?? "Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePage(params.nick, params.wikiName, params.pageName);
      navigate(`/wiki/${params.nick}/${params.wikiName}/Home`, { replace: true });
    } catch (e: any) {
      setSaveError(e.message ?? "Error deleting");
      setDeleting(false);
    }
  }

  const safeHtml = () =>
    DOMPurify.sanitize(pageData()?.html ?? "", { USE_PROFILES: { html: true } });

  const isHome = () => params.pageName === "Home";

  return (
    <div class="flex gap-4 max-w-6xl mx-auto p-4">
      {/* ── Sidebar: page list ──────────────────────────────────────────── */}
      <aside class="hidden md:flex flex-col w-52 shrink-0 gap-2">
        <div class="bg-surface border border-rim rounded-xl p-3 space-y-1 sticky top-20">
          <Show when={currentWiki()}>
            <div class="text-xs font-semibold uppercase tracking-wide text-muted mb-2 truncate">
              {currentWiki()!.name}
            </div>
          </Show>

          <Show when={pagesLoading()}>
            <For each={[1, 2, 3]}>
              {() => <div class="h-6 rounded bg-elevated animate-pulse" />}
            </For>
          </Show>

          <Show when={!pagesLoading()}>
            <For each={pages()}>
              {(p) => (
                <A
                  href={`/wiki/${params.nick}/${params.wikiName}/${p.url_name}`}
                  class="block text-sm px-2 py-1 rounded-lg truncate transition-colors"
                  classList={{
                    "bg-elevated text-txt": p.url_name === params.pageName,
                    "text-muted hover:bg-elevated hover:text-txt":
                      p.url_name !== params.pageName,
                  }}
                >
                  {p.name}
                </A>
              )}
            </For>
          </Show>

          <div class="pt-2 border-t border-rim mt-2">
            <A
              href={`/wiki/${params.nick}`}
              class="text-xs text-muted hover:text-txt transition-colors"
            >
              ← All wikis
            </A>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main class="flex-1 min-w-0 space-y-4">

        <Show when={pageLoading()}>
          <div class="space-y-3">
            <div class="h-8 w-1/3 bg-surface border border-rim rounded-xl animate-pulse" />
            <div class="h-4 w-full bg-surface border border-rim rounded animate-pulse" />
            <div class="h-4 w-5/6 bg-surface border border-rim rounded animate-pulse" />
            <div class="h-4 w-4/6 bg-surface border border-rim rounded animate-pulse" />
          </div>
        </Show>

        <Show when={!pageLoading() && pageData()}>
          {/* Toolbar */}
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <h1 class="text-xl font-semibold text-txt">
                {pageData()!.page.name}
              </h1>
              <span class="text-xs text-muted bg-elevated border border-rim px-2 py-0.5 rounded-full">
                {pageData()!.page.mime_type.replace("text/", "")}
              </span>
            </div>

            <Show when={canWrite()}>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleEditMode}
                  class="text-sm border border-rim text-muted hover:bg-elevated px-3 py-1.5 rounded-lg transition-colors"
                >
                  {editMode() ? "Cancel" : "Edit"}
                </button>

                <Show when={editMode()}>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving()}
                    class="text-sm bg-accent-muted text-accent border border-rim
                           hover:bg-elevated px-3 py-1.5 rounded-lg transition-colors
                           disabled:opacity-50"
                  >
                    {saving() ? "Saving…" : "Save"}
                  </button>
                </Show>

                <Show when={!isHome() && !editMode()}>
                  <button
                    type="button"
                    onClick={() => setConfirmDel(true)}
                    class="text-sm border border-rim text-muted hover:bg-elevated px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </Show>
              </div>
            </Show>
          </div>

          {/* Edit mode */}
          <Show when={editMode()}>
            <div class="space-y-2">
              <textarea
                class="w-full h-96 bg-surface border border-rim text-txt rounded-xl px-3 py-2
                       text-sm font-mono resize-y hover:border-rim-strong focus:outline-none"
                value={draftContent()}
                onInput={(e) => updateDraft(e.currentTarget.value)}
              />
              <input
                type="text"
                class="w-full bg-surface border border-rim text-txt rounded-lg px-3 py-2 text-sm
                       hover:border-rim-strong focus:outline-none"
                placeholder="Short description of your changes (optional)"
                value={commitMsg()}
                onInput={(e) => setCommitMsg(e.currentTarget.value)}
              />
              <Show when={saveError()}>
                <p class="text-sm text-red-400">{saveError()}</p>
              </Show>
            </div>
          </Show>

          {/* Rendered view */}
          <Show when={!editMode()}>
            <article
              class="prose dark:prose-invert prose-neutral max-w-none
                     [&_a]:text-accent [&_a]:no-underline [&_a:hover]:underline
                     [&_pre]:bg-elevated [&_pre]:border [&_pre]:border-rim [&_pre]:rounded-xl
                     [&_blockquote]:border-l-2 [&_blockquote]:border-rim [&_blockquote]:text-muted"
              innerHTML={safeHtml()}
            />
          </Show>
        </Show>

        {/* Delete confirmation modal */}
        <Show when={confirmDel()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div class="bg-surface border border-rim rounded-xl p-6 space-y-4 max-w-sm w-full mx-4">
              <p class="text-txt text-sm">
                Delete <strong>{params.pageName}</strong>? This cannot be undone.
              </p>
              <Show when={saveError()}>
                <p class="text-sm text-red-400">{saveError()}</p>
              </Show>
              <div class="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDel(false)}
                  class="text-sm border border-rim text-muted hover:bg-elevated px-3 py-1.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting()}
                  class="text-sm border border-rim text-red-400 hover:bg-elevated px-3 py-1.5 rounded-lg
                         disabled:opacity-50"
                >
                  {deleting() ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </Show>
      </main>
    </div>
  );
}
