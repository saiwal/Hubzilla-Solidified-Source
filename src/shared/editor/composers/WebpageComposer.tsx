import { createSignal, Show, onCleanup } from "solid-js";
import { useI18n } from "@/i18n";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { getCsrfToken } from "@/shared/lib/csrf";
import { useEncrypt } from "../useEncrypt";
import EncryptPanel from "../components/EncryptPanel";
import { isEncryptedBody } from "@/shared/lib/postCrypto";
import { isFeatureEnabled } from "@/shared/store/auth-store";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { bbcodeToInsert } from "../attachments/insertHelpers";
import AclPicker, { entryKey, type AclMode, type AclEntry } from "../components/AclPicker";
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
    uuid: string;
    mid: string;
    title: string;
    summary: string;
    slug: string;
    body: string;
    mimetype: string;
    item_private?: number;
    public_policy?: string;
    allow_cid?: string[];
    allow_gid?: string[];
    deny_cid?: string[];
    deny_gid?: string[];
  };
  onSaved?: () => void;
  onCancel?: () => void;
}

function slugify(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function WebpageComposer(props: Props) {
  const { t } = useI18n();
  const caps = CAPABILITIES.webpage;
  const isEditing = () => !!props.initial?.uuid;
  const scope = props.initial?.uuid
    ? `webpage:edit:${props.initial.uuid}`
    : "webpage:new";

  const attach = createAttachmentStore(props.nick, scope);
  const mention = useMention();
  const emoji   = useEmoji();
  let editorWrapRef: HTMLDivElement | undefined;

  const getEditor = () =>
    editorWrapRef?.querySelector<HTMLDivElement>("[contenteditable]") ?? null;
  const getTA = () =>
    editorWrapRef?.querySelector<HTMLTextAreaElement>("textarea") ?? null;

  // ── ACL state — initialize from existing page data when editing ──────────────
  const initialAclMode = (): AclMode => {
    const p = props.initial;
    if (!p) return "public";
    if (p.public_policy === "contacts") return "connections";
    if ((p.allow_cid?.length ?? 0) > 0 || (p.allow_gid?.length ?? 0) > 0) return "custom";
    return "public";
  };
  const initialAllowEntries = (): Set<string> => {
    const p = props.initial;
    if (!p) return new Set();
    return new Set([
      ...(p.allow_cid ?? []).map((h) => `c:${h}`),
      ...(p.allow_gid ?? []).map((g) => `g:${g}`),
    ]);
  };
  const initialDenyEntries = (): Set<string> => {
    const p = props.initial;
    if (!p) return new Set();
    return new Set([
      ...(p.deny_cid ?? []).map((h) => `c:${h}`),
      ...(p.deny_gid ?? []).map((g) => `g:${g}`),
    ]);
  };

  const [aclMode, setAclMode] = createSignal<AclMode>(initialAclMode());
  const [allowEntries, setAllowEntries] = createSignal<Set<string>>(initialAllowEntries());
  const [denyEntries, setDenyEntries]   = createSignal<Set<string>>(initialDenyEntries());

  function toggleEntry(entry: AclEntry, list: "allow" | "deny") {
    const key = entryKey(entry);
    const [getSet, setSet] = list === "allow"
      ? [allowEntries, setAllowEntries]
      : [denyEntries, setDenyEntries];
    const setOther = list === "allow" ? setDenyEntries : setAllowEntries;
    void getSet();
    setSet((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
    setOther((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }

  function clearEntries() {
    setAllowEntries(new Set<string>());
    setDenyEntries(new Set<string>());
  }

  function aclJson(): Record<string, unknown> {
    const mode = aclMode();
    if (mode === "public")      return { scope: "public" };
    if (mode === "connections") return { scope: "connections" };

    const allow_cid: string[] = [];
    const allow_gid: string[] = [];
    const deny_cid:  string[] = [];
    const deny_gid:  string[] = [];
    for (const key of allowEntries()) {
      const [type, ...rest] = key.split(":");
      const xid = rest.join(":");
      if (type === "c") allow_cid.push(xid);
      if (type === "g") allow_gid.push(xid);
    }
    for (const key of denyEntries()) {
      const [type, ...rest] = key.split(":");
      const xid = rest.join(":");
      if (type === "c") deny_cid.push(xid);
      if (type === "g") deny_gid.push(xid);
    }
    return { scope: "custom", allow_cid, allow_gid, deny_cid, deny_gid };
  }

  function withFileAttachments(body: string): string {
    const tags = attach.attachments()
      .filter((a) => a.status === "ready" && (a.hash || a.resourceId))
      .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
      .join("\n");
    return tags ? `${body}\n${tags}` : body;
  }

  const store = createComposerStore(async (body, meta) => {
    if (isEditing()) {
      const csrf = await getCsrfToken();
      const res = await fetch("/api/webpages", {
        method:      "POST",
        headers:     { "X-CSRF-Token": csrf, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action:    "update",
          uuid:      props.initial!.uuid,
          title:     meta.title    ?? "",
          summary:   meta.summary  ?? "",
          body:      withFileAttachments(body),
          mimetype:  meta.mimetype ?? "text/bbcode",
          pagetitle: meta.slug     ?? "",
          ...aclJson(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? err?.error ?? "Save failed");
      }
    } else {
      const csrf = await getCsrfToken();
      const res = await fetch("/api/webpages", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action:    "create",
          title:     meta.title    ?? "",
          summary:   meta.summary  ?? "",
          body:      withFileAttachments(body),
          mimetype:  meta.mimetype ?? "text/bbcode",
          pagetitle: meta.slug     ?? "",
          ...aclJson(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Save failed");
      }
    }

    attach.clear();
    props.onSaved?.();
  }, scope, { initialBody: props.initial?.body });

  const enc = useEncrypt(() => store.body(), store.setBody);

  if (props.initial) {
    store.setTitle(props.initial.title);
    store.setSummary(props.initial.summary);
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
      store.setSlug(slugify(v));
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

      {/* Summary */}
      <Show when={caps.summary}>
        <textarea
          placeholder={t("editor.article_summary_placeholder")}
          value={store.summary()}
          onInput={(e) => store.setSummary(e.currentTarget.value)}
          rows={2}
          class="w-full px-0 py-1.5 text-sm bg-transparent text-txt
                 placeholder:text-muted border-0 border-b border-rim outline-none
                 focus:border-accent transition-colors resize-none"
        />
      </Show>

      {/* Slug */}
      <Show when={caps.slug}>
        <div>
          <label class="block text-xs text-muted mb-1">{t("editor.slug_label")}</label>
          <div class="flex items-center gap-1">
            <input
              type="text"
              placeholder={t("editor.slug_placeholder")}
              value={store.slug()}
              onInput={(e) => store.setSlug(e.currentTarget.value)}
              class="flex-1 px-2 py-1.5 text-sm font-mono rounded border border-rim bg-surface
                     text-txt outline-none hover:border-rim-strong focus:border-rim-strong
                     transition-colors"
            />
            <button
              type="button"
              title={t("editor.generate_slug")}
              onClick={() => store.setSlug(slugify(store.title()))}
              class="px-2.5 py-1.5 rounded border border-rim text-muted hover:text-txt
                     hover:border-rim-strong transition-colors text-sm leading-none"
            >
              ↻
            </button>
          </div>
        </div>
      </Show>

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

      {/* Encrypt panel */}
      <Show when={enc.open()}>
        <EncryptPanel enc={enc} />
      </Show>

      {/* Actions */}
      <div class="flex flex-wrap items-center gap-3 border-t border-rim pt-4">
        <button
          type="button"
          onClick={() => { store.reset(); attach.clear(); clearEntries(); setAclMode("public"); enc.reset(); props.onCancel?.(); }}
          class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                 hover:bg-elevated transition-colors"
        >
          {isEditing() ? t("editor.cancel_btn") : t("editor.discard")}
        </button>

        {/* ACL picker */}
        <Show when={caps.aclPicker}>
          <AclPicker
            mode={aclMode()}
            onModeChange={setAclMode}
            allowEntries={allowEntries()}
            denyEntries={denyEntries()}
            onToggle={toggleEntry}
            onClear={clearEntries}
          />
        </Show>

        {/* Encrypt toggle */}
        <Show when={isFeatureEnabled("content_encrypt")}>
          <Show
            when={!isEncryptedBody(store.body())}
            fallback={
              <span class="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                🔒 {t("editor.encrypt_badge")}
              </span>
            }
          >
            <button
              type="button"
              onClick={() => enc.setOpen((o) => !o)}
              class={
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors " +
                (enc.open()
                  ? "bg-accent/10 text-accent border-accent/30"
                  : "text-muted hover:text-txt hover:bg-elevated border-rim")
              }
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {t("editor.encrypt_toggle")}
            </button>
          </Show>
        </Show>

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
