import { createSignal, Show, onCleanup } from "solid-js";
import { DraftsList } from "../components/DraftsList";
import { createComposerStore } from "../store/createComposerStore";
import { useI18n } from "@/i18n";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { apiFetch } from "@/shared/lib/fetch";
import AclPicker, { entryKey, type AclMode, type AclEntry } from "../components/AclPicker";
import {
  useMention,
  getWysiwygMentionQuery,
  getTextareaMentionQuery,
  getCaretRect,
} from "../mention/useMention";
import MentionPopup from "../mention/MentionPopup";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { bbcodeToInsert } from "../attachments/insertHelpers";

interface Props {
  profileUid: number;
  nick: string;
  /** Pass existing article data to edit rather than create */
  initial?: {
    uuid: string;
    title: string;
    summary: string;
    slug: string;
    category: string;
    body: string;
  };
  onSaved?: () => void;
}

export default function ArticleComposer(props: Props) {
  const { t } = useI18n();
  const caps = CAPABILITIES.article;
  const [wordCount, setWordCount] = createSignal(0);
  const [draftsOpen, setDraftsOpen] = createSignal(false);
  const isEditing = () => !!props.initial?.uuid;

  // ── Scope (shared by both stores for matching IDB keys) ─────────────────────
  const scope = props.initial?.uuid
    ? `article:edit:${props.initial.uuid}`
    : "article:new";

  // ── Attachment store ─────────────────────────────────────────────────────────
  const attach = createAttachmentStore(props.nick, scope);

  // ── ACL state ────────────────────────────────────────────────────────────────
  const [aclMode, setAclMode] = createSignal<AclMode>("connections");
  const [allowEntries, setAllowEntries] = createSignal<Set<string>>(new Set<string>());
  const [denyEntries, setDenyEntries] = createSignal<Set<string>>(new Set<string>());

  function toggleEntry(entry: AclEntry, list: "allow" | "deny") {
    const key = entryKey(entry);
    const [getSet, setSet] = list === "allow"
      ? [allowEntries, setAllowEntries]
      : [denyEntries, setDenyEntries];
    const setOther = list === "allow" ? setDenyEntries : setAllowEntries;
    void getSet();
    setSet((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setOther((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }

  function clearEntries() {
    setAllowEntries(new Set<string>());
    setDenyEntries(new Set<string>());
  }

  // ── Mention autocomplete ─────────────────────────────────────────────────────
  const mention = useMention();
  let editorWrapRef: HTMLDivElement | undefined;

  const getEditor = () =>
    editorWrapRef?.querySelector<HTMLDivElement>("[contenteditable]") ?? null;
  const getTA = () =>
    editorWrapRef?.querySelector<HTMLTextAreaElement>("textarea") ?? null;

  // ── Composer store ────────────────────────────────────────────────────────────
  // Append [attachment]hash,0[/attachment] BBCode for non-image files.
  // Item.php scans the body for these tags and builds native Hubzilla attachments.
  function withFileAttachments(body: string): string {
    const tags = attach.attachments()
      .filter((a) => a.status === "ready" && (a.hash || a.resourceId))
      .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
      .join("\n");
    return tags ? `${body}\n${tags}` : body;
  }

  const store = createComposerStore(async (body, meta) => {
    if (isEditing()) {
      // ── Edit existing article ─────────────────────────────────────────────────
      const mode = aclMode();
      const aclPayload: Record<string, unknown> = {};
      if (mode === "public") {
        aclPayload.contact_allow = [];
        aclPayload.group_allow   = [];
        aclPayload.contact_deny  = [];
        aclPayload.group_deny    = [];
        aclPayload.public_policy = "";
      } else if (mode === "connections") {
        aclPayload.contact_allow = [];
        aclPayload.group_allow   = [];
        aclPayload.contact_deny  = [];
        aclPayload.group_deny    = [];
        aclPayload.public_policy = "contacts";
      } else {
        if (allowEntries().size === 0)
          throw new Error("Select at least one connection or group to allow.");
        const cAllow: string[] = [];
        const gAllow: string[] = [];
        const cDeny: string[]  = [];
        const gDeny: string[]  = [];
        for (const key of allowEntries()) {
          const [type, ...rest] = key.split(":");
          if (type === "c") cAllow.push(rest.join(":"));
          if (type === "g") gAllow.push(rest.join(":"));
        }
        for (const key of denyEntries()) {
          const [type, ...rest] = key.split(":");
          if (type === "c") cDeny.push(rest.join(":"));
          if (type === "g") gDeny.push(rest.join(":"));
        }
        aclPayload.contact_allow = cAllow;
        aclPayload.group_allow   = gAllow;
        aclPayload.contact_deny  = cDeny;
        aclPayload.group_deny    = gDeny;
      }

      const res = await apiFetch(
        `/api/item/${props.initial!.uuid}/edit`,
        {
          method: "POST",
          body: JSON.stringify({
            body: withFileAttachments(body),
            title:    meta.title    ?? "",
            summary:  meta.summary  ?? "",
            slug:     meta.slug     ?? "",
            category: meta.category ?? "",
            mimetype: meta.mimetype ?? "text/bbcode",
            ...aclPayload,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Save failed");
      }
    } else {
      // ── Create new article ────────────────────────────────────────────────────
      const csrf =
        document.querySelector<HTMLMetaElement>('meta[name="form_security_token"]')
          ?.content ?? "";

      const fd = new FormData();
      fd.append("mimetype",    meta.mimetype ?? "text/bbcode");
      fd.append("obj_type",    "");
      fd.append("profile_uid", String(props.profileUid));
      fd.append("return",      `articles/${props.nick}`);
      fd.append("webpage",     "7");   // ITEM_TYPE_ARTICLE
      fd.append("preview",     "0");
      fd.append("consensus",   "0");
      fd.append("nocomment",   "0");
      fd.append("title",       meta.title    ?? "");
      fd.append("summary",     meta.summary  ?? "");
      fd.append("category",    meta.category ?? "");
      fd.append("pagetitle",   meta.slug     ?? "");
      fd.append("body",        withFileAttachments(body));
      if (csrf) fd.append("form_security_token", csrf);

      // ACL
      const mode = aclMode();
      if (mode === "public") {
        fd.append("contact_allow", "");
        fd.append("group_allow",   "");
        fd.append("contact_deny",  "");
        fd.append("group_deny",    "");
        fd.append("public_policy", "");
      } else if (mode === "connections") {
        fd.append("contact_allow", "");
        fd.append("group_allow",   "");
        fd.append("contact_deny",  "");
        fd.append("group_deny",    "");
        fd.append("public_policy", "contacts");
      } else {
        if (allowEntries().size === 0)
          throw new Error("Select at least one connection or group to allow.");
        for (const key of allowEntries()) {
          const [type, ...rest] = key.split(":");
          const xid = rest.join(":");
          if (type === "c") fd.append("contact_allow[]", xid);
          if (type === "g") fd.append("group_allow[]", xid);
        }
        for (const key of denyEntries()) {
          const [type, ...rest] = key.split(":");
          const xid = rest.join(":");
          if (type === "c") fd.append("contact_deny[]", xid);
          if (type === "g") fd.append("group_deny[]", xid);
        }
      }

      const res = await fetch("/item", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) throw new Error("Save failed");
    }

    attach.clear();
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

  function insertSelected() {
    const entry = mention.filtered()[mention.activeIdx()];
    if (!entry) return;
    const editor = getEditor();
    if (editor) {
      mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML));
      return;
    }
    const ta = getTA();
    if (ta) mention.insertTextarea(entry, ta, store.setBody);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!mention.open()) return;
    const consumed = mention.onKeyDown(e);
    if (consumed && (e.key === "Enter" || e.key === "Tab")) insertSelected();
  }

  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  const onBodyChange = (v: string) => {
    store.setBody(v);
    const text = v.replace(/<[^>]*>/g, " ");
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);

    // Detect @-mention synchronously while still inside the input event
    // (window.getSelection() is only reliable at this point, not in a deferred effect)
    const editor = getEditor();
    if (editor) {
      const q = getWysiwygMentionQuery();
      if (q !== null) {
        const rect = getCaretRect();
        if (rect) { mention.openWithQuery(q, rect); return; }
      }
      mention.close();
      return;
    }
    const ta = getTA();
    if (ta) {
      const q = getTextareaMentionQuery(ta);
      if (q !== null) { mention.openWithQuery(q, ta.getBoundingClientRect()); return; }
    }
    mention.close();
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
        placeholder={t("editor.article_title_placeholder")}
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

      {/* Slug + Category row */}
      <div class="flex gap-3">
        <Show when={caps.slug}>
          <div class="flex-1 min-w-0">
            <label class="block text-xs text-muted mb-1">{t("editor.slug_label")}</label>
            <input
              type="text"
              placeholder={t("editor.slug_placeholder")}
              value={store.slug()}
              onInput={(e) => store.setSlug(e.currentTarget.value)}
              class="w-full px-2 py-1.5 text-sm font-mono rounded border border-rim bg-surface
                     text-txt outline-none hover:border-rim-strong focus:border-rim-strong transition-colors"
            />
          </div>
        </Show>
        <Show when={caps.category}>
          <div class="flex-1 min-w-0">
            <label class="block text-xs text-muted mb-1">{t("editor.category_label")}</label>
            <input
              type="text"
              placeholder={t("editor.category_field_placeholder")}
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
        <label class="text-xs text-muted">{t("editor.format_label")}</label>
        <select
          value={store.mimetype()}
          onChange={(e) =>
            store.setMimetype(e.currentTarget.value as import("../types/editor.types").MimeType)
          }
          class="text-xs px-2 py-1 rounded border border-rim bg-surface text-txt"
        >
          <option value="text/bbcode">BBCode</option>
          <option value="text/markdown">Markdown</option>
          <option value="text/html">HTML</option>
        </select>
        <span class="text-xs text-muted ml-auto">{t("editor.words_count", { count: wordCount() })}</span>
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
          accept="both"
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
            if (editor) {
              mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML));
              return;
            }
            const ta = getTA();
            if (ta) mention.insertTextarea(entry, ta, store.setBody);
          }}
        />
      </Show>


      {/* Drafts panel */}
      <Show when={draftsOpen()}>
        <DraftsList
          drafts={store.savedDrafts()}
          onLoad={(d) => { store.loadSavedDraft(d); setDraftsOpen(false); }}
          onDelete={(id) => void store.deleteSavedDraft(id)}
          onClose={() => setDraftsOpen(false)}
        />
      </Show>

      {/* Actions */}
      <div class="flex flex-wrap items-center gap-3 border-t border-rim pt-4">
        {/* Left: discard + draft controls */}
        <div class="flex gap-2 items-center">
          <button
            type="button"
            onClick={() => { store.reset(); attach.clear(); clearEntries(); setAclMode("connections"); }}
            class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                   hover:bg-elevated transition-colors"
          >
            {isEditing() ? t("editor.cancel_btn") : t("editor.discard")}
          </button>
          <Show when={store.body().trim()}>
            <button
              type="button"
              title={t("editor.save_draft")}
              onClick={() => void store.saveAsDraft()}
              class="p-1.5 rounded-lg border border-rim text-muted hover:text-txt hover:bg-elevated transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3v5H9V3m0 14h6" />
              </svg>
            </button>
          </Show>
          <Show when={store.savedDrafts().length > 0}>
            <button
              type="button"
              onClick={() => setDraftsOpen((o) => !o)}
              class={
                "px-2.5 py-1.5 rounded-lg border text-xs transition-colors " +
                (draftsOpen()
                  ? "border-rim bg-elevated text-txt"
                  : "border-rim text-muted hover:text-txt hover:bg-elevated")
              }
            >
              {t("editor.drafts_btn", { count: store.savedDrafts().length })}
            </button>
          </Show>
        </div>

        {/* Centre: ACL picker */}
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

        {/* Right: publish */}
        <button
          type="button"
          onClick={() => store.submit()}
          disabled={
            store.submitting() ||
            attach.uploading() ||
            !store.body().trim() ||
            !store.title().trim()
          }
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
