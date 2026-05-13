import { Show, onCleanup, createEffect } from "solid-js";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { useAuth } from "@/shared/store/auth-store";
import {
  useMention,
  getWysiwygMentionQuery,
  getTextareaMentionQuery,
  getCaretRect,
} from "@/shared/editor/mention/useMention";
import MentionPopup from "@/shared/editor/mention/MentionPopup";

interface Props {
  parentMid?: string;
  parentIid?: number;
  profileUid: number;
  onSubmitted?: (body: string) => void;
}

export default function CommentComposer(props: Props) {
  const auth = useAuth();
  const caps = CAPABILITIES.comment;

  const store = createComposerStore(
    async (body) => {
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="api-token"]')
          ?.content ?? "";

      const params = new URLSearchParams({
        body,
        mimetype: "text/bbcode",
        type: "wall-comment",
        ...(props.parentIid ? { parent: String(props.parentIid) } : {}),
        profile_uid: String(props.profileUid),
      });

      const res = await fetch("/item", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRF-Token": csrf,
        },
        body: params.toString(),
      });

      if (!res.ok) throw new Error("Comment failed");
      props.onSubmitted?.(body);
    },
    `comment:${props.parentMid ?? "new"}`,
  );

  // ── Mention autocomplete ──────────────────────────────────────────────────
  // RichEditor renders a contenteditable div for the comment surface
  // (CAPABILITIES.comment toolbar has no source/BBCode tab by default).
  // We hook into the same wysiwyg path used by PostComposer.

  const mention = useMention();
  let wrapperRef: HTMLDivElement | undefined;

  function getEditor(): HTMLDivElement | null {
    return wrapperRef?.querySelector("[contenteditable]") ?? null;
  }

  function getTA(): HTMLTextAreaElement | null {
    return wrapperRef?.querySelector("textarea") ?? null;
  }

  // Drive mention state reactively off store.body().
  // RichEditor fires props.onInput(innerHTML) on every keystroke, which calls
  // store.setBody — so this effect runs on every character typed.
  createEffect(() => {
    void store.body(); // subscribe

    // Check which surface is active and extract the query from the live DOM.
    const editor = getEditor();
    if (editor) {
      // contenteditable — read from Selection API (caret-aware)
      const q = getWysiwygMentionQuery();
      if (q !== null) {
        const rect = getCaretRect();
        if (rect) mention.openWithQuery(q, rect);
        return;
      }
    }

    const ta = getTA();
    if (ta) {
      const q = getTextareaMentionQuery(ta);
      if (q !== null) {
        mention.openWithQuery(q, ta.getBoundingClientRect());
        return;
      }
    }

    mention.close();
  });

  function onKeyDown(e: KeyboardEvent) {
    if (!mention.open()) return;
    const consumed = mention.onKeyDown(e);
    if (!consumed) return;

    if (e.key === "Enter" || e.key === "Tab") {
      const entry = mention.filtered()[mention.activeIdx()];
      if (!entry) return;

      const editor = getEditor();
      if (editor) {
        mention.insertWysiwyg(entry, () => {
          // Sync innerHTML back to body signal after DOM mutation
          store.setBody(editor.innerHTML);
        });
        return;
      }
      const ta = getTA();
      if (ta) mention.insertTextarea(entry, ta, store.setBody);
    }
  }

  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  if (!auth()?.isLocal) return null;

  return (
    <div class="mt-3 space-y-2">
      <div class="flex gap-2 items-start">
        <Show when={auth()?.nick}>
          <div class="w-7 h-7 rounded-full bg-accent-muted text-accent flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
            {auth()!.nick[0].toUpperCase()}
          </div>
        </Show>

        <div ref={wrapperRef} class="flex-1 min-w-0">
          <RichEditor
            body={store.body()}
            onInput={store.setBody}
            capabilities={caps}
            tab={store.tab()}
            onTabChange={store.setTab}
            onCtrlEnter={() => {
              if (!mention.open()) store.submit();
            }}
            placeholder="Write a reply… (Ctrl+Enter to send)"
            minHeight="60px"
          />
        </div>
      </div>

      <Show when={store.error()}>
        <p class="text-xs text-red-500 pl-9">{store.error()}</p>
      </Show>

      <div class="flex justify-end gap-2 pl-9">
        <Show when={store.body().trim()}>
          <button
            type="button"
            onClick={store.reset}
            class="px-3 py-1 text-xs rounded-lg border border-rim text-muted hover:bg-elevated transition-colors"
          >
            Cancel
          </button>
        </Show>
        <button
          type="button"
          onClick={() => store.submit()}
          disabled={store.submitting() || !store.body().trim()}
          class="px-3 py-1 text-xs font-medium rounded-lg bg-accent text-accent-txt
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {store.submitting() ? "Sending\u2026" : "Reply"}
        </button>
      </div>

      <Show when={mention.open() && mention.rect() !== null}>
        <MentionPopup
          query={mention.query()!}
          entries={mention.filtered()}
          anchorRect={mention.rect()!}
          activeIdx={mention.activeIdx()}
          onSelect={(entry) => {
            const editor = getEditor();
            if (editor) {
              mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML));
              return;
            }
            const ta = getTA();
            if (ta) mention.insertTextarea(entry, ta, store.setBody);
          }}
        />
      </Show>
    </div>
  );
}
