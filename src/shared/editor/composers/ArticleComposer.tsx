import { createSignal, Show } from "solid-js";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import EditorPreview from "../core/EditorPreview";
import { CAPABILITIES } from "../types/editor.types";

interface Props {
  profileUid: number;
  nick: string;
  /** Pass an existing article's data to edit rather than create */
  initial?: {
    title: string;
    summary: string;
    slug: string;
    category: string;
    body: string;
    itemId?: number;
  };
  onSaved?: () => void;
}

export default function ArticleComposer(props: Props) {
  const caps = CAPABILITIES.article;
  const [showPreview, setShowPreview] = createSignal(false);
  const [wordCount, setWordCount] = createSignal(0);

  const scope = props.initial?.itemId
    ? `article:${props.initial.itemId}`
    : "article:new";

  const store = createComposerStore(async (body, meta) => {
    // /item uses Hubzilla's own form security token injected into the page
    const csrf =
      document.querySelector<HTMLMetaElement>('meta[name="form_security_token"]')
        ?.content ?? "";

    const params = new URLSearchParams({
      mimetype:    meta.mimetype ?? "text/bbcode",
      obj_type:    "",
      profile_uid: String(props.profileUid),
      return:      `articles/${props.nick}`,
      webpage:     "7",   // ITEM_TYPE_ARTICLE
      preview:     "0",
      consensus:   "0",
      nocomment:   "0",
      title:       meta.title    ?? "",
      summary:     meta.summary  ?? "",
      category:    meta.category ?? "",
      pagetitle:   meta.slug     ?? "",
      body,
    });

    if (csrf) params.set("form_security_token", csrf);

    const res = await fetch("/item", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!res.ok) throw new Error("Save failed");
    props.onSaved?.();
  }, scope);

  // Seed from initial if editing
  if (props.initial) {
    store.setTitle(props.initial.title);
    store.setSummary(props.initial.summary);
    store.setSlug(props.initial.slug);
    store.setCategory(props.initial.category);
    store.setBody(props.initial.body);
  }

  const onBodyChange = (v: string) => {
    store.setBody(v);
    const text = v.replace(/<[^>]*>/g, " ");
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
  };

  const onTitleChange = (v: string) => {
    store.setTitle(v);
    if (!store.slug()) {
      store.setSlug(
        v.toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      );
    }
  };

  return (
    <div class="max-w-3xl mx-auto space-y-4 py-6 px-4">
      {/* Title */}
      <input
        type="text"
        placeholder="Article title…"
        value={store.title()}
        onInput={(e) => onTitleChange(e.currentTarget.value)}
        class="w-full px-0 py-2 text-2xl font-bold bg-transparent text-txt
               placeholder:text-muted border-0 border-b border-rim outline-none
               focus:border-accent transition-colors"
      />

      {/* Summary */}
      <Show when={caps.summary}>
        <textarea
          placeholder="Short summary (shown in article listings)…"
          value={store.summary()}
          onInput={(e) => store.setSummary(e.currentTarget.value)}
          rows={2}
          class="w-full px-0 py-1.5 text-sm bg-transparent text-txt
                 placeholder:text-muted border-0 border-b border-rim outline-none
                 focus:border-accent transition-colors resize-none"
        />
      </Show>

      {/* Slug + Category row */}
      <div class="flex gap-3">
        <Show when={caps.slug}>
          <div class="flex-1 min-w-0">
            <label class="block text-xs text-muted mb-1">Slug</label>
            <input
              type="text"
              placeholder="url-slug"
              value={store.slug()}
              onInput={(e) => store.setSlug(e.currentTarget.value)}
              class="w-full px-2 py-1.5 text-sm font-mono rounded border border-rim bg-surface
                     text-txt outline-none hover:border-rim-strong focus:border-rim-strong transition-colors"
            />
          </div>
        </Show>
        <Show when={caps.category}>
          <div class="flex-1 min-w-0">
            <label class="block text-xs text-muted mb-1">Category</label>
            <input
              type="text"
              placeholder="e.g. tech, personal"
              value={store.category()}
              onInput={(e) => store.setCategory(e.currentTarget.value)}
              class="w-full px-2 py-1.5 text-sm rounded border border-rim bg-surface
                     text-txt outline-none hover:border-rim-strong focus:border-rim-strong transition-colors"
            />
          </div>
        </Show>
      </div>

      {/* Mimetype picker */}
      <div class="flex items-center gap-3">
        <label class="text-xs text-muted">Format</label>
        <select
          value={store.mimetype()}
          onChange={(e) =>
            store.setMimetype(
              e.currentTarget.value as "text/bbcode" | "text/html",
            )
          }
          class="text-xs px-2 py-1 rounded border border-rim bg-surface text-txt"
        >
          <option value="text/bbcode">BBCode</option>
          <option value="text/html">HTML</option>
        </select>
        <span class="text-xs text-muted ml-auto">{wordCount()} words</span>
      </div>

      {/* Editor */}
      <RichEditor
        body={store.body()}
        onInput={onBodyChange}
        capabilities={caps}
        tab={store.tab()}
        onTabChange={store.setTab}
        placeholder="Start writing…"
        minHeight="400px"
      />

      {/* Preview */}
      <Show when={showPreview() && store.body().trim()}>
        <EditorPreview body={store.body()} mimetype={store.mimetype()} />
      </Show>

      {/* Error */}
      <Show when={store.error()}>
        <p class="text-sm text-red-500 bg-red-50/10 px-3 py-2 rounded-lg">
          {store.error()}
        </p>
      </Show>

      {/* Actions */}
      <div class="flex items-center justify-between border-t border-rim pt-4">
        <div class="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                   hover:bg-elevated transition-colors"
          >
            {showPreview() ? "Hide preview" : "Preview"}
          </button>
          <button
            type="button"
            onClick={store.reset}
            class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                   hover:bg-elevated transition-colors"
          >
            Discard
          </button>
        </div>
        <button
          type="button"
          onClick={() => store.submit()}
          disabled={
            store.submitting() ||
            !store.body().trim() ||
            !store.title().trim()
          }
          class="px-5 py-1.5 text-sm font-medium rounded-lg bg-accent text-accent-txt
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {store.submitting()
            ? "Saving…"
            : props.initial
              ? "Save changes"
              : "Publish"}
        </button>
      </div>
    </div>
  );
}
