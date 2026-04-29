import { createSignal, createEffect } from "solid-js";
import type { MimeType, ComposerMeta } from "../types/editor.types";

export type SubmitFn = (body: string, meta: ComposerMeta) => Promise<void>;

export type ComposerStore = ReturnType<typeof createComposerStore>;

/**
 * Factory — call once per composer *instance* (inside the component body),
 * never at module level unless the composer is a true singleton (e.g. PostComposer in a slot).
 *
 * `scope` is used as the localStorage draft key, so make it unique:
 *   "hq:post", "article:new", "comment:<parentMid>"
 */
export function createComposerStore(submitFn: SubmitFn, scope: string) {
  const DRAFT_KEY = `draft:${scope}`;

  const [body, setBody] = createSignal(localStorage.getItem(DRAFT_KEY) ?? "");
  const [title, setTitle] = createSignal("");
  const [slug, setSlug] = createSignal("");
  const [category, setCategory] = createSignal("");
  const [mimetype, setMimetype] = createSignal<MimeType>("text/bbcode");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [tab, setTab] = createSignal<"wysiwyg" | "source">("wysiwyg");

  // Persist body as draft while typing; remove when submitted or cleared
  createEffect(() => {
    const b = body();
    if (b) localStorage.setItem(DRAFT_KEY, b);
    else localStorage.removeItem(DRAFT_KEY);
  });

  async function submit(extra: ComposerMeta = {}) {
    if (!body().trim() || submitting()) return;
    setError(null);
    setSubmitting(true);
    try {
      await submitFn(body(), {
        title: title(),
        slug: slug(),
        category: category(),
        mimetype: mimetype(),
        ...extra,
      });
      // Reset on success
      setBody("");
      setTitle("");
      setSlug("");
      setCategory("");
      localStorage.removeItem(DRAFT_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setBody("");
    setTitle("");
    setSlug("");
    setCategory("");
    setError(null);
    localStorage.removeItem(DRAFT_KEY);
  }

  return {
    // State
    body, setBody,
    title, setTitle,
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
