import { createSignal, Show } from "solid-js";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import EditorPreview from "../core/EditorPreview";
import { CAPABILITIES } from "../types/editor.types";

interface Props {
  profileUid: number;
  /** Scope key for localStorage draft — override when you have multiple
   *  PostComposers (e.g. "channel:post" vs "hq:post") */
  scope?: string;
  onPosted?: () => void;
}

export default function PostComposer(props: Props) {
  const caps = CAPABILITIES.post;
  const [showPreview, setShowPreview] = createSignal(false);

  const store = createComposerStore(
    async (body, meta) => {
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="api-token"]')
          ?.content ?? "";

      const params = new URLSearchParams({
        body,
        mimetype: meta.mimetype ?? "text/bbcode",
        type: "wall",
        profile_uid: String(props.profileUid),
      });
      if (meta.title) params.set("title", meta.title);

      const res = await fetch("/item", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-Token": csrf,
        },
        body: params.toString(),
      });

      if (!res.ok) throw new Error("Post failed");
      props.onPosted?.();
    },
    props.scope ?? "hq:post",
  );

  return (
    <div class="bg-surface border border-rim rounded-xl p-4 space-y-3">
      {/* Title (optional for wall posts) */}
      <Show when={caps.title}>
        <input
          type="text"
          placeholder="Title (optional)"
          value={store.title()}
          onInput={(e) => store.setTitle(e.currentTarget.value)}
          class="w-full px-3 py-1.5 text-sm rounded-lg border border-rim bg-surface
                 text-txt placeholder:text-muted outline-none
                 hover:border-rim-strong focus:border-rim-strong transition-colors"
        />
      </Show>

      {/* Editor */}
      <RichEditor
        body={store.body()}
        onInput={store.setBody}
        capabilities={caps}
        tab={store.tab()}
        onTabChange={store.setTab}
        placeholder="What's on your mind?"
      />

      {/* Inline preview toggle */}
      <Show when={caps.preview && store.body().trim()}>
        <Show when={showPreview()}>
          <EditorPreview body={store.body()} mimetype={store.mimetype()} />
        </Show>
      </Show>

      {/* Error */}
      <Show when={store.error()}>
        <p class="text-xs text-red-500">{store.error()}</p>
      </Show>

      {/* Footer */}
      <div class="flex items-center justify-between">
        <div class="flex gap-2">
          {/* Mimetype picker */}
          <select
            value={store.mimetype()}
            onChange={(e) =>
              store.setMimetype(
                e.currentTarget.value as "text/bbcode" | "text/html",
              )
            }
            class="text-xs px-2 py-1 rounded border border-rim bg-surface text-muted"
          >
            <option value="text/bbcode">BBCode</option>
            <option value="text/html">HTML</option>
          </select>

          {/* Preview toggle */}
          <Show when={caps.preview && store.body().trim()}>
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              class="text-xs px-2 py-1 rounded border border-rim text-muted hover:bg-elevated transition-colors"
            >
              {showPreview() ? "Hide preview" : "Preview"}
            </button>
          </Show>
        </div>

        <button
          type="button"
          onClick={() => store.submit()}
          disabled={store.submitting() || !store.body().trim()}
          class="px-4 py-1.5 text-sm font-medium rounded-lg bg-accent text-accent-txt
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {store.submitting() ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  );
}
