import { createSignal, createEffect } from "solid-js";
import { toast } from "@/shared/store/toast";
import { storageGet, storageSet, storageDel } from "@/shared/lib/storage";
import { listServerDrafts, saveServerDraft, deleteServerDraft } from "../api/drafts";
import type { MimeType, ComposerMeta } from "../types/editor.types";

export type SubmitFn = (body: string, meta: ComposerMeta) => Promise<void>;

export type ComposerStore = ReturnType<typeof createComposerStore>;

export type SavedDraft = {
  id: string;
  serverMid?: string;
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
type LocalDraft = {
  body: string;
  title: string;
  summary: string;
  slug: string;
  category: string;
  mimetype: MimeType;
};

export function createComposerStore(
  submitFn: SubmitFn,
  scope: string,
  options?: { initialBody?: string },
) {
  const DRAFT_KEY = `draft:${scope}`;

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
  const [loadedDraftId, setLoadedDraftId] = createSignal<string | null>(null);
  // Prevents the autosave effect from running (and deleting the draft) before
  // the async storage read has had a chance to restore the previous body.
  const [initialized, setInitialized] = createSignal(false);

  // Load saved drafts from server, filtered to this scope
  listServerDrafts().then((serverDrafts) => {
    const forScope = serverDrafts
      .filter((sd) => sd.scope === scope)
      .map((sd) => ({ ...sd, id: sd.serverMid }));
    setSavedDrafts(forScope);
  });

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
      setLoadedDraftId(pending.id);
      await storageDel(PENDING_KEY);
    } else if (!options?.initialBody) {
      // Support both the new LocalDraft shape and the old plain-string format
      const raw = await storageGet<LocalDraft | string | null>(DRAFT_KEY, null);
      if (raw) {
        const local: LocalDraft = typeof raw === "string"
          ? { body: raw, title: "", summary: "", slug: "", category: "", mimetype: "text/bbcode" }
          : raw;
        setBody(local.body);
        setTitle(local.title);
        setSummary(local.summary);
        setSlug(local.slug);
        setCategory(local.category);
        setMimetype(local.mimetype);
      }
    }
    setInitialized(true);
  });

  // Persist the full local draft while typing; clear when submitted or reset.
  // Guard on `initialized` so the effect doesn't fire (and delete the saved
  // draft) during the async window before storage has been read on mount.
  createEffect(() => {
    if (!initialized()) return;
    const snapshot: LocalDraft = {
      body:     body(),
      title:    title(),
      summary:  summary(),
      slug:     slug(),
      category: category(),
      mimetype: mimetype(),
    };
    if (snapshot.body) storageSet(DRAFT_KEY, snapshot);
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
      const draftId = loadedDraftId();
      if (draftId) {
        setLoadedDraftId(null);
        void deleteSavedDraft(draftId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submit failed";
      setError(msg);
      toast.error(msg);
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
    setLoadedDraftId(null);
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
    const now = Date.now();
    const tempDraft = {
      id: "",
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
    const serverMid = await saveServerDraft(tempDraft, scope);
    if (!serverMid) {
      toast.error("Failed to save draft");
      return;
    }
    const draft: SavedDraft = { ...tempDraft, id: serverMid, serverMid };
    setSavedDrafts([draft, ...savedDrafts()]);
  }

  function loadSavedDraft(draft: SavedDraft): void {
    setBody(draft.body);
    setTitle(draft.title);
    setSummary(draft.summary);
    setSlug(draft.slug);
    setCategory(draft.category);
    setMimetype(draft.mimetype);
    setLoadedDraftId(draft.id);
  }

  async function deleteSavedDraft(id: string): Promise<void> {
    setSavedDrafts(savedDrafts().filter((d) => d.id !== id));
    void deleteServerDraft(id); // id === serverMid for server-only drafts
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
