import { Show, onCleanup, createEffect } from "solid-js";
import { apiFetch } from "@/shared/lib/fetch";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { useAuth, currentNick } from "@/shared/store/auth-store";
import { useI18n } from "@/i18n";
import {
  useMention,
  getWysiwygMentionQuery,
  getTextareaMentionQuery,
  getCaretRect,
} from "@/shared/editor/mention/useMention";
import MentionPopup from "@/shared/editor/mention/MentionPopup";
import { useEmoji, getWysiwygEmojiQuery, getTextareaEmojiQuery } from "@/shared/editor/emoji/useEmoji";
import EmojiPopup from "@/shared/editor/emoji/EmojiPopup";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { bbcodeToInsert, patchInsertedAlt } from "../attachments/insertHelpers";

interface Props {
  /** Parent item uuid — full-URL mids break the /api/item/:id path (slashes). */
  parentUuid?: string;
  profileUid: number;
  onSubmitted?: (body: string) => void;
}

export default function CommentComposer(props: Props) {
  const { t } = useI18n();
  const auth = useAuth();
  const caps = CAPABILITIES.comment;

  const scope = `comment:${props.parentUuid ?? "new"}`;
  const attach = createAttachmentStore(currentNick(), scope);

  const store = createComposerStore(
    async (body) => {
      if (!props.parentUuid) throw new Error("Missing parent item");

      const fileTags = attach.attachments()
        .filter((a) => a.status === "ready" && (a.hash || a.resourceId))
        .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
        .join("\n");
      const augmentedBody = fileTags ? `${body}\n${fileTags}` : body;

      const res = await apiFetch(
        `/api/item/${encodeURIComponent(props.parentUuid)}/comment`,
        {
          method: "POST",
          body: JSON.stringify({ body: augmentedBody, mimetype: "text/bbcode" }),
        },
      );
      if (!res.ok) throw new Error(`Comment failed: ${res.status}`);
      // The endpoint reports permission problems as { error } in a 200 body
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!json.success) throw new Error(json.error ?? "Comment failed");

      attach.clear();
      props.onSubmitted?.(body);
    },
    scope,
  );

  // ── Mention + emoji autocomplete ─────────────────────────────────────────
  const mention = useMention();
  const emoji   = useEmoji();
  let wrapperRef: HTMLDivElement | undefined;

  function getEditor(): HTMLDivElement | null {
    return wrapperRef?.querySelector("[contenteditable]") ?? null;
  }

  function getTA(): HTMLTextAreaElement | null {
    return wrapperRef?.querySelector("textarea") ?? null;
  }

  createEffect(() => {
    void store.body();
    const editor = getEditor();
    if (editor) {
      const mq = getWysiwygMentionQuery();
      if (mq !== null) { const r = getCaretRect(); if (r) mention.openWithQuery(mq, r); emoji.close(); return; }
      const eq = getWysiwygEmojiQuery();
      if (eq !== null) { const r = getCaretRect(); if (r) emoji.openWithQuery(eq, r); mention.close(); return; }
    }
    const ta = getTA();
    if (ta) {
      const mq = getTextareaMentionQuery(ta);
      if (mq !== null) { mention.openWithQuery(mq, ta.getBoundingClientRect()); emoji.close(); return; }
      const eq = getTextareaEmojiQuery(ta);
      if (eq !== null) { emoji.openWithQuery(eq, ta.getBoundingClientRect()); mention.close(); return; }
    }
    mention.close();
    emoji.close();
  });

  function onKeyDown(e: KeyboardEvent) {
    if (mention.open()) {
      const consumed = mention.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") {
          const entry = mention.filtered()[mention.activeIdx()];
          if (!entry) return;
          const editor = getEditor();
          if (editor) { mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); return; }
          const ta = getTA();
          if (ta) mention.insertTextarea(entry, ta, store.setBody);
        }
      }
      return;
    }
    if (emoji.open()) {
      const consumed = emoji.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") {
          const entry = emoji.filtered()[emoji.activeIdx()];
          if (!entry) return;
          const editor = getEditor();
          if (editor) { emoji.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); return; }
          const ta = getTA();
          if (ta) emoji.insertTextarea(entry, ta, store.setBody);
        }
      }
      return;
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
            onPasteFiles={(files) => attach.addUploads(files)}
            placeholder={t("editor.write_reply_ctrl")}
            minHeight="60px"
          />
          <AttachmentBar
            store={attach}
            nick={currentNick()}
            accept="both"
            onInsert={(bbcode) => {
              store.setBody(store.body() + "\n" + bbcodeToInsert(bbcode, "text/bbcode"));
            }}
            onAltChange={(att) => {
              store.setBody(patchInsertedAlt(store.body(), att, "text/bbcode"));
            }}
          />
        </div>
      </div>


      <div class="flex justify-end gap-2 pl-9">
        <Show when={store.body().trim()}>
          <button
            type="button"
            onClick={store.reset}
            class="px-3 py-1 text-xs rounded-lg border border-rim text-muted hover:bg-elevated transition-colors"
          >
            {t("editor.cancel_btn")}
          </button>
        </Show>
        <button
          type="button"
          onClick={() => store.submit()}
          disabled={store.submitting() || attach.uploading() || !store.body().trim()}
          class="px-3 py-1 text-xs font-medium rounded-lg bg-accent text-accent-fg
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {store.submitting() ? t("editor.sending") : t("editor.reply_btn")}
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
            if (editor) { mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); return; }
            const ta = getTA();
            if (ta) mention.insertTextarea(entry, ta, store.setBody);
          }}
        />
      </Show>

      <Show when={emoji.open() && emoji.rect() !== null}>
        <EmojiPopup
          entries={emoji.filtered()}
          anchorRect={emoji.rect()!}
          activeIdx={emoji.activeIdx()}
          onSelect={(entry) => {
            const editor = getEditor();
            if (editor) { emoji.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); return; }
            const ta = getTA();
            if (ta) emoji.insertTextarea(entry, ta, store.setBody);
          }}
        />
      </Show>
    </div>
  );
}
