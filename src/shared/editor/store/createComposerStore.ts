import { createSignal, createEffect } from "solid-js";
import { storageGet, storageSet, storageDel } from "@/shared/lib/storage";
import type { MimeType, ComposerMeta } from "../types/editor.types";

export type SubmitFn = (body: string, meta: ComposerMeta) => Promise<void>;

export type ComposerStore = ReturnType<typeof createComposerStore>;

/**
 * Factory — call once per composer *instance* (inside the component body),
 * never at module level unless the composer is a true singleton.
 *
 * `scope` is used as the IDB draft key, so make it unique:
 *   "hq:post", "article:new", "comment:<parentMid>"
 */
export function createComposerStore(submitFn: SubmitFn, scope: string) {
  const DRAFT_KEY = `draft:${scope}`;

  const [body, setBody]         = createSignal("");
  const [title, setTitle]       = createSignal("");
  const [summary, setSummary]   = createSignal("");
  const [slug, setSlug]         = createSignal("");
  const [category, setCategory] = createSignal("");
  const [mimetype, setMimetype] = createSignal<MimeType>("text/bbcode");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError]       = createSignal<string | null>(null);
  const [tab, setTab]           = createSignal<"wysiwyg" | "source">("wysiwyg");

  storageGet<string>(DRAFT_KEY, "").then(setBody);

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
    // Actions
    submit,
    reset,
  };
}
