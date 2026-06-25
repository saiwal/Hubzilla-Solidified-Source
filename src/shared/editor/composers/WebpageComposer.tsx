import { Show, onCleanup } from "solid-js";
import { useI18n } from "@/i18n";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { apiFetch } from "@/shared/lib/fetch";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { bbcodeToInsert } from "../attachments/insertHelpers";
import {
  useMention,
  getWysiwygMentionQuery,
  getTextareaMentionQuery,
  getCaretRect,
} from "../mention/useMention";
import MentionPopup from "../mention/MentionPopup";
import { useEmoji, getWysiwygEmojiQuery, getTextareaEmojiQuery } from "../emoji/useEmoji";
import EmojiPopup from "../emoji/EmojiPopup";

interface Props {
  profileUid: number;
  nick: string;
  initial?: {
    mid: string;
    title: string;
    slug: string;
    body: string;
    mimetype: string;
  };
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function WebpageComposer(props: Props) {
  const { t } = useI18n();
  const caps = CAPABILITIES.webpage;
  const isEditing = () => !!props.initial?.mid;
  const scope = props.initial?.mid
    ? `webpage:edit:${props.initial.mid}`
    : "webpage:new";

  const attach = createAttachmentStore(props.nick, scope);
  const mention = useMention();
  const emoji   = useEmoji();
  let editorWrapRef: HTMLDivElement | undefined;

  const getEditor = () =>
    editorWrapRef?.querySelector<HTMLDivElement>("[contenteditable]") ?? null;
  const getTA = () =>
    editorWrapRef?.querySelector<HTMLTextAreaElement>("textarea") ?? null;

  function withFileAttachments(body: string): string {
    const tags = attach.attachments()
      .filter((a) => a.status === "ready" && (a.hash || a.resourceId))
      .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
      .join("\n");
    return tags ? `${body}\n${tags}` : body;
  }

  const store = createComposerStore(async (body, meta) => {
    if (isEditing()) {
      const res = await apiFetch(`/api/item/${props.initial!.mid}/edit`, {
        method: "POST",
        body: JSON.stringify({
          body: withFileAttachments(body),
          title:    meta.title ?? "",
          summary:  "",
          mimetype: meta.mimetype ?? "text/bbcode",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Save failed");
      }
    } else {
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="form_security_token"]')
          ?.content ?? "";
      const fd = new FormData();
      fd.append("mimetype",    meta.mimetype ?? "text/bbcode");
      fd.append("obj_type",    "");
      fd.append("profile_uid", String(props.profileUid));
      fd.append("return",      `webpages/${props.nick}`);
      fd.append("webpage",     "1");
      fd.append("preview",     "0");
      fd.append("title",       meta.title    ?? "");
      fd.append("pagetitle",   meta.slug     ?? "");
      fd.append("body",        withFileAttachments(body));
      if (csrf) fd.append("form_security_token", csrf);

      const res = await fetch("/item", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Save failed");
    }

    attach.clear();
    props.onSaved?.();
  }, scope, { initialBody: props.initial?.body });

  if (props.initial) {
    store.setTitle(props.initial.title);
    store.setSlug(props.initial.slug);
    if (props.initial.mimetype) store.setMimetype(props.initial.mimetype as any);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (mention.open()) {
      const consumed = mention.onKeyDown(e);
      if (consumed && (e.key === "Enter" || e.key === "Tab")) {
        const entry = mention.filtered()[mention.activeIdx()];
        if (!entry) return;
        const editor = getEditor();
        if (editor) { mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); return; }
        const ta = getTA();
        if (ta) mention.insertTextarea(entry, ta, store.setBody);
      }
      return;
    }
    if (emoji.open()) {
      const consumed = emoji.onKeyDown(e);
      if (consumed && (e.key === "Enter" || e.key === "Tab")) {
        const entry = emoji.filtered()[emoji.activeIdx()];
        if (!entry) return;
        const editor = getEditor();
        if (editor) { emoji.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); return; }
        const ta = getTA();
        if (ta) emoji.insertTextarea(entry, ta, store.setBody);
      }
      return;
    }
  }

  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  const onBodyChange = (v: string) => {
    store.setBody(v);
    const editor = getEditor();
    if (editor) {
      const mq = getWysiwygMentionQuery();
      if (mq !== null) { const r = getCaretRect(); if (r) { mention.openWithQuery(mq, r); emoji.close(); return; } }
      const eq = getWysiwygEmojiQuery();
      if (eq !== null) { const r = getCaretRect(); if (r) { emoji.openWithQuery(eq, r); mention.close(); return; } }
      mention.close(); emoji.close(); return;
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
  };

  const onTitleChange = (v: string) => {
    store.setTitle(v);
    if (!isEditing() && !store.slug()) {
      store.setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  return (
    <div class="max-w-3xl mx-auto space-y-4 py-6 px-4">
      {/* Title */}
      <input
        type="text"
        placeholder={t("webpages.title_placeholder")}
        value={store.title()}
        onInput={(e) => onTitleChange(e.currentTarget.value)}
        class="w-full px-0 py-2 text-2xl font-bold bg-transparent text-txt
               placeholder:text-muted border-0 border-b border-rim outline-none
               focus:border-accent transition-colors"
      />

      {/* Slug */}
      <div class="flex items-center gap-3">
        <Show when={caps.slug}>
          <div class="flex-1 min-w-0">
            <label class="block text-xs text-muted mb-1">{t("editor.slug_label")}</label>
            <input
              type="text"
              placeholder={t("editor.slug_placeholder")}
              value={store.slug()}
              onInput={(e) => store.setSlug(e.currentTarget.value)}
              disabled={isEditing()}
              class="w-full px-2 py-1.5 text-sm font-mono rounded border border-rim bg-surface
                     text-txt outline-none hover:border-rim-strong focus:border-rim-strong
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </Show>
      </div>

      {/* Editor */}
      <div ref={editorWrapRef}>
        <RichEditor
          body={store.body()}
          onInput={onBodyChange}
          capabilities={caps}
          tab={store.tab()}
          onTabChange={store.setTab}
          mimetype={store.mimetype()}
          placeholder={t("editor.start_writing")}
          minHeight="400px"
        />
        <AttachmentBar
          store={attach}
          nick={props.nick}
          accept="files"
          onInsert={(bbcode) => {
            store.setBody(store.body() + "\n" + bbcodeToInsert(bbcode, store.mimetype()));
          }}
        />
      </div>

      {/* Mention popup */}
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

      {/* Emoji popup */}
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

      {/* Actions */}
      <div class="flex items-center gap-3 border-t border-rim pt-4">
        <button
          type="button"
          onClick={() => { store.reset(); attach.clear(); props.onCancel?.(); }}
          class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                 hover:bg-elevated transition-colors"
        >
          {isEditing() ? t("editor.cancel_btn") : t("editor.discard")}
        </button>

        <button
          type="button"
          onClick={() => store.submit()}
          disabled={store.submitting() || attach.uploading() || !store.body().trim() || !store.title().trim()}
          class="ml-auto px-5 py-1.5 text-sm font-medium rounded-lg bg-accent text-accent-fg
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {store.submitting()
            ? t("editor.saving")
            : isEditing()
              ? t("editor.save_changes")
              : t("editor.publish_btn")}
        </button>
      </div>
    </div>
  );
}
