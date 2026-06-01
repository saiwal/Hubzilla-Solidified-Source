import { createSignal, createEffect } from "solid-js";
import { storageGet, storageSet, storageDel } from "@/shared/lib/storage";
import type { MimeType, ComposerMeta } from "../types/editor.types";

export type SubmitFn = (body: string, meta: ComposerMeta) => Promise<void>;

export type ComposerStore = ReturnType<typeof createComposerStore>;

export type SavedDraft = {
  id: string;
  created: number;
  updated: number;
  preview: string;
  body: string;
  title: string;
  summary: string;
  slug: string;
  category: string;
  mimetype: MimeType;
};

/**
 * Factory — call once per composer *instance* (inside the component body),
 * never at module level unless the composer is a true singleton.
 *
 * `scope` is used as the IDB draft key, so make it unique:
 *   "hq:post", "article:new", "comment:<parentMid>"
 *
 * When `options.initialBody` is provided the IDB draft will NOT override it.
 */
export function createComposerStore(
  submitFn: SubmitFn,
  scope: string,
  options?: { initialBody?: string },
) {
  const DRAFT_KEY = `draft:${scope}`;
  const DRAFTS_KEY = `drafts-list:${scope}`;

  const [body, setBody]         = createSignal(options?.initialBody ?? "");
  const [title, setTitle]       = createSignal("");
  const [summary, setSummary]   = createSignal("");
  const [slug, setSlug]         = createSignal("");
  const [category, setCategory] = createSignal("");
  const [mimetype, setMimetype] = createSignal<MimeType>("text/bbcode");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError]       = createSignal<string | null>(null);
  const [tab, setTab]           = createSignal<"wysiwyg" | "source" | "preview">("wysiwyg");
  const [savedDrafts, setSavedDrafts] = createSignal<SavedDraft[]>([]);

  // Load the saved-drafts list
  storageGet<SavedDraft[]>(DRAFTS_KEY, []).then(setSavedDrafts);

  // On init, a pending-draft (written cross-navigation by the HQ DraftsWidget) takes
  // priority over the regular auto-save; fall back to auto-save if none present.
  const PENDING_KEY = `pending-draft:${scope}`;
  storageGet<SavedDraft | null>(PENDING_KEY, null).then(async (pending) => {
    if (pending && !options?.initialBody) {
      setBody(pending.body);
      setTitle(pending.title);
      setSummary(pending.summary);
      setSlug(pending.slug);
      setCategory(pending.category);
      setMimetype(pending.mimetype);
      await storageDel(PENDING_KEY);
      return;
    }
    const v = await storageGet<string>(DRAFT_KEY, "");
    if (!options?.initialBody && v) setBody(v);
  });

  // Persist body as draft while typing; remove when submitted or cleared
  createEffect(() => {
    const b = body();
    if (b) storageSet(DRAFT_KEY, b);
    else storageDel(DRAFT_KEY);
  });

  async function submit(extra: ComposerMeta = {}) {
    if (!body().trim() || submitting()) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitFn(body(), {
        title:    title(),
        summary:  summary(),
        slug:     slug(),
        category: category(),
        mimetype: mimetype(),
        ...extra,
      });
      // Reset on success
      setBody("");
      setTitle("");
      setSummary("");
      setSlug("");
      setCategory("");
      storageDel(DRAFT_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setBody("");
    setTitle("");
    setSummary("");
    setSlug("");
    setCategory("");
    setError(null);
    storageDel(DRAFT_KEY);
  }

  function makeDraftPreview(b: string): string {
    return b
      .replace(/<[^>]+>/g, "")
      .replace(/\[[\w/]+(?:=[^\]]+)?\]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
  }

  async function saveAsDraft(): Promise<void> {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const now = Date.now();
    const draft: SavedDraft = {
      id,
      created: now,
      updated: now,
      preview: makeDraftPreview(body()),
      body: body(),
      title: title(),
      summary: summary(),
      slug: slug(),
      category: category(),
      mimetype: mimetype(),
    };
    const updated = [draft, ...savedDrafts()];
    setSavedDrafts(updated);
    await storageSet(DRAFTS_KEY, updated);
  }

  function loadSavedDraft(draft: SavedDraft): void {
    setBody(draft.body);
    setTitle(draft.title);
    setSummary(draft.summary);
    setSlug(draft.slug);
    setCategory(draft.category);
    setMimetype(draft.mimetype);
  }

  async function deleteSavedDraft(id: string): Promise<void> {
    const updated = savedDrafts().filter((d) => d.id !== id);
    setSavedDrafts(updated);
    if (updated.length > 0) await storageSet(DRAFTS_KEY, updated);
    else await storageDel(DRAFTS_KEY);
  }

  return {
    // State
    body, setBody,
    title, setTitle,
    summary, setSummary,
    slug, setSlug,
    category, setCategory,
    mimetype, setMimetype,
    submitting,
    error,
    tab, setTab,
    savedDrafts,
    // Actions
    submit,
    reset,
    saveAsDraft,
    loadSavedDraft,
    deleteSavedDraft,
  };
}
