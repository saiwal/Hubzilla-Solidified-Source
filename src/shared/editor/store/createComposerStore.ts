import { createSignal, createEffect } from "solid-js";
import type { MimeType, ComposerMeta } from "../types/editor.types";

type SubmitFn = (body: string, meta: ComposerMeta) => Promise<void>;

export function createComposerStore(submitFn: SubmitFn, scope: string) {
  const DRAFT_KEY = `draft:${scope}`;

  const [body, setBody] = createSignal(localStorage.getItem(DRAFT_KEY) ?? "");
  const [title, setTitle] = createSignal("");
  const [mimetype, setMimetype] = createSignal<MimeType>("text/bbcode");
  const [submitting, setSubmitting] = createSignal(false);
  const [tab, setTab] = createSignal<"wysiwyg" | "source">("wysiwyg");

  // Persist draft on every keystroke
  createEffect(() => {
    const b = body();
    if (b) localStorage.setItem(DRAFT_KEY, b);
    else localStorage.removeItem(DRAFT_KEY);
  });

  async function submit(meta: ComposerMeta = {}) {
    if (!body().trim() || submitting()) return;
    setSubmitting(true);
    try {
      await submitFn(body(), { title: title(), mimetype: mimetype(), ...meta });
      setBody("");
      setTitle("");
      localStorage.removeItem(DRAFT_KEY);
    } finally {
      setSubmitting(false);
    }
  }

  return { body, setBody, title, setTitle, mimetype, setMimetype,
           submitting, tab, setTab, submit };
}
