import { createSignal, Show, For, onCleanup } from "solid-js";
import { DraftsList } from "../components/DraftsList";
import { createComposerStore } from "../store/createComposerStore";
import { useI18n } from "@/i18n";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { apiFetch } from "@/shared/lib/fetch";
import AclPicker, { entryKey, type AclMode, type AclEntry } from "../components/AclPicker";
import { useEncrypt } from "../useEncrypt";
import EncryptPanel from "../components/EncryptPanel";
import { isEncryptedBody } from "@/shared/lib/postCrypto";
import { isFeatureEnabled } from "@/shared/store/auth-store";
import {
  useMention,
  getWysiwygMentionQuery,
  getTextareaMentionQuery,
  getCaretRect,
} from "../mention/useMention";
import MentionPopup from "../mention/MentionPopup";
import { useEmoji, getWysiwygEmojiQuery, getTextareaEmojiQuery } from "../emoji/useEmoji";
import EmojiPopup from "../emoji/EmojiPopup";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { bbcodeToInsert } from "../attachments/insertHelpers";
import { htmlToSource } from "../core/htmlToSource";

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

  // ── Multi-category helpers ────────────────────────────────────────────────────
  const [pendingCategory, setPendingCategory] = createSignal("");

  const categoryTags = () =>
    store.category().split(",").map((s) => s.trim()).filter(Boolean);

  function addCategoryTag(raw: string) {
    const incoming = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!incoming.length) return;
    const merged = [...new Set([...categoryTags(), ...incoming])];
    store.setCategory(merged.join(","));
    setPendingCategory("");
  }

  function removeCategoryTag(tag: string) {
    store.setCategory(categoryTags().filter((t) => t !== tag).join(","));
  }

  function onCategoryKeyDown(e: KeyboardEvent) {
    const val = pendingCategory().trim();
    if ((e.key === "Enter" || e.key === ",") && val) {
      e.preventDefault();
      addCategoryTag(pendingCategory());
    } else if (e.key === "Backspace" && !pendingCategory() && categoryTags().length) {
      store.setCategory(categoryTags().slice(0, -1).join(","));
    }
  }

  // ── Poll state ───────────────────────────────────────────────────────────────
  const [pollEnabled, setPollEnabled] = createSignal(false);
  const [pollAnswers, setPollAnswers] = createSignal<string[]>(["", ""]);
  const [pollExpireValue, setPollExpireValue] = createSignal("1");
  const [pollExpireUnit, setPollExpireUnit] = createSignal("Days");

  function updatePollAnswer(i: number, val: string) {
    setPollAnswers((prev) => prev.map((a, j) => (j === i ? val : a)));
  }
  function addPollAnswer() {
    if (pollAnswers().length < 10) setPollAnswers((prev) => [...prev, ""]);
  }
  function removePollAnswer(i: number) {
    setPollAnswers((prev) => prev.filter((_, j) => j !== i));
  }

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

  // ── Mention + emoji autocomplete ─────────────────────────────────────────────
  const mention = useMention();
  const emoji   = useEmoji();
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

      // ── Poll ──
      if (pollEnabled()) {
        const answers = pollAnswers().filter((a) => a.trim());
        if (answers.length < 2)
          throw new Error("At least 2 poll options are required.");
        for (const a of answers) fd.append("poll_answers[]", a);
        fd.append("poll_expire_value", pollExpireValue());
        fd.append("poll_expire_unit", pollExpireUnit());
      }

      const res = await fetch("/item", {
        method: "POST",
        credentials: "include",
        redirect: "manual",
        body: fd,
      });
      if (res.type !== "opaqueredirect" && !res.ok) throw new Error("Save failed");
    }

    attach.clear();
    props.onSaved?.();
  }, scope);

  const enc = useEncrypt(() => store.body(), store.setBody);

  // Seed from initial if editing
  if (props.initial) {
    store.setTitle(props.initial.title);
    store.setSummary(props.initial.summary);
    store.setSlug(props.initial.slug);
    store.setCategory(props.initial.category);
    store.setBody(props.initial.body);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (mention.open()) {
      const consumed = mention.onKeyDown(e);
      if (consumed && (e.key === "Enter" || e.key === "Tab")) {
        const entry = mention.filtered()[mention.activeIdx()];
        if (!entry) return;
        const editor = getEditor();
        if (editor) { mention.insertWysiwyg(entry, () => store.setBody(htmlToSource(editor.innerHTML, store.mimetype()))); return; }
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
        if (editor) { emoji.insertWysiwyg(entry, () => store.setBody(htmlToSource(editor.innerHTML, store.mimetype()))); return; }
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
    const text = v.replace(/<[^>]*>/g, " ");
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);

    const editor = getEditor();
    if (editor) {
      const mq = getWysiwygMentionQuery();
      if (mq !== null) { const r = getCaretRect(); if (r) { mention.openWithQuery(mq, r); emoji.close(); return; } }
      const eq = getWysiwygEmojiQuery();
      if (eq !== null) { const r = getCaretRect(); if (r) { emoji.openWithQuery(eq, r); mention.close(); return; } }
      mention.close(); emoji.close();
      return;
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
            <div class="flex flex-wrap items-center gap-1.5 px-2 py-1.5 rounded border border-rim bg-surface
                        hover:border-rim-strong focus-within:border-rim-strong transition-colors">
              <For each={categoryTags()}>
                {(tag) => (
                  <span class="flex items-center gap-1 px-2 py-0.5 rounded bg-elevated text-xs text-txt">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeCategoryTag(tag)}
                      class="text-muted hover:text-txt leading-none"
                    >×</button>
                  </span>
                )}
              </For>
              <input
                type="text"
                placeholder={categoryTags().length ? "" : t("editor.category_field_placeholder")}
                value={pendingCategory()}
                onInput={(e) => setPendingCategory(e.currentTarget.value)}
                onKeyDown={onCategoryKeyDown}
                onBlur={() => { if (pendingCategory().trim()) addCategoryTag(pendingCategory()); }}
                class="flex-1 min-w-16 bg-transparent text-sm text-txt outline-none placeholder:text-muted"
              />
            </div>
          </div>
        </Show>
      </div>

      <div class="flex items-center justify-end">
        <span class="text-xs text-muted">{t("editor.words_count", { count: wordCount() })}</span>
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

      {/* Poll */}
      <div class="space-y-2">
        <button
          type="button"
          onClick={() => setPollEnabled((p) => !p)}
          class={
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors " +
            (pollEnabled()
              ? "bg-accent/10 text-accent border-accent/30"
              : "text-muted hover:text-txt hover:bg-elevated border-rim")
          }
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {t("editor.poll_toggle")}
        </button>
        <Show when={pollEnabled()}>
          <div class="rounded-lg border border-rim bg-elevated/40 p-4 space-y-2">
            <For each={pollAnswers()}>
              {(ans, i) => (
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    value={ans}
                    placeholder={`${t("editor.poll_answer_placeholder")} ${i() + 1}`}
                    onInput={(e) => updatePollAnswer(i(), e.currentTarget.value)}
                    class="flex-1 bg-transparent border border-rim rounded px-2.5 py-1.5 text-sm
                           text-txt placeholder:text-muted outline-none focus:border-rim-strong transition-colors"
                  />
                  <Show when={pollAnswers().length > 2}>
                    <button
                      type="button"
                      onClick={() => removePollAnswer(i())}
                      title={t("editor.poll_remove_answer")}
                      class="p-1.5 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Show>
                </div>
              )}
            </For>
            <div class="flex flex-wrap items-center gap-3 pt-1">
              <Show when={pollAnswers().length < 10}>
                <button
                  type="button"
                  onClick={addPollAnswer}
                  class="text-sm text-accent hover:opacity-80 transition-opacity"
                >
                  {t("editor.poll_add_answer")}
                </button>
              </Show>
              <div class="flex items-center gap-2 ml-auto">
                <span class="text-sm text-muted shrink-0">{t("editor.poll_expires_label")}</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={pollExpireValue()}
                  onInput={(e) => setPollExpireValue(e.currentTarget.value)}
                  class="w-16 bg-transparent border border-rim rounded px-2 py-1 text-sm text-txt
                         outline-none focus:border-rim-strong transition-colors"
                />
                <select
                  value={pollExpireUnit()}
                  onChange={(e) => setPollExpireUnit(e.currentTarget.value)}
                  class="bg-surface border border-rim rounded px-2 py-1 text-sm text-txt
                         outline-none focus:border-rim-strong transition-colors cursor-pointer"
                >
                  <option value="Days">Days</option>
                  <option value="Hours">Hours</option>
                  <option value="Minutes">Minutes</option>
                  <option value="Weeks">Weeks</option>
                </select>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Encrypt panel */}
      <Show when={enc.open()}>
        <EncryptPanel enc={enc} />
      </Show>

      {/* Mention popup */}
      <Show when={mention.open() && mention.rect() !== null}>
        <MentionPopup
          query={mention.query()!}
          entries={mention.filtered()}
          anchorRect={mention.rect()!}
          activeIdx={mention.activeIdx()}
          onSelect={(entry) => {
            const editor = getEditor();
            if (editor) { mention.insertWysiwyg(entry, () => store.setBody(htmlToSource(editor.innerHTML, store.mimetype()))); return; }
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
            if (editor) { emoji.insertWysiwyg(entry, () => store.setBody(htmlToSource(editor.innerHTML, store.mimetype()))); return; }
            const ta = getTA();
            if (ta) emoji.insertTextarea(entry, ta, store.setBody);
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
            onClick={() => { store.reset(); attach.clear(); clearEntries(); setAclMode("connections"); setPollEnabled(false); setPollAnswers(["", ""]); setPollExpireValue("1"); setPollExpireUnit("Days"); setPendingCategory(""); enc.reset(); }}
            class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                   hover:bg-elevated transition-colors"
          >
            {isEditing() ? t("editor.cancel_btn") : t("editor.discard")}
          </button>
          <Show when={store.body().trim()}>
            <button
              type="button"
              onClick={() => void store.saveAsDraft()}
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rim text-sm text-muted hover:text-txt hover:bg-elevated transition-colors"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3v5H9V3m0 14h6" />
              </svg>
              {t("editor.save_draft")}
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
