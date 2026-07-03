/**
 * PostComposer.tsx
 * Modal post composer for the Hubzilla SolidJS frontend.
 *
 * - Portal-mounted (always renders at document.body)
 * - Uses shared createComposerStore + RichEditor + EditorToolbar infrastructure
 * - ACL picker with per-connection allow/deny (contacts + groups)
 * - Expiry picker
 * - Draft auto-save to IndexedDB (via createComposerStore)
 * - Ctrl+Enter to post, Escape to close
 * - Submits to POST /api/item (SPA Item handler) with JSON body + CSRF token
 */

import {
  createSignal,
  createEffect,
  onCleanup,
  Show,
  For,
  type Component,
} from "solid-js";
import { DraftsList } from "../components/DraftsList";
import { Portal } from "solid-js/web";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import AclPicker, { entryKey } from "../components/AclPicker";
import type { AclMode } from "../components/AclPicker";
import type { AclEntry } from "@/modules/network/api";
import {
  useMention,
  getWysiwygMentionQuery,
  getTextareaMentionQuery,
  getCaretRect,
} from "../mention/useMention";
import MentionPopup from "../mention/MentionPopup";
import { useEmoji, getWysiwygEmojiQuery, getTextareaEmojiQuery } from "../emoji/useEmoji";
import EmojiPopup from "../emoji/EmojiPopup";
import { helpable } from "@/shared/lib/helpable";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { currentNick, isFeatureEnabled } from "@/shared/store/auth-store";
import { bbcodeToInsert } from "../attachments/insertHelpers";
import type { FileAcl } from "@/modules/files/api";
import { useI18n } from "@/i18n";
import { getCsrfToken } from "@/shared/lib/csrf";
import { encryptBody, isEncryptedBody } from "@/shared/lib/postCrypto";
void helpable;

// ─── Types ────────────────────────────────────────────────────────────────────

export type { AclMode };

export interface ComposerProps {
  open: boolean;
  onClose: () => void;
  /** Hubzilla channel_id — required by Item::post() for ownership/permissions */
  profileUid: number;
  onPosted?: (itemId: number) => void;
  initialBody?: string;
  initialAclMode?: AclMode;
  initialAllowEntries?: Set<string>;
  parentId?: number;
  /** Hide the ACL picker and lock scope to "connections" (channel owner's default).
   *  Use when the poster is a visitor — they don't control the wall's privacy. */
  hideAcl?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PostComposer: Component<ComposerProps> = (props) => {
  const { t } = useI18n();
  const caps = CAPABILITIES.post;

  // ── Scope (shared by both stores for matching IDB keys) ───────────────────
  const scope = props.parentId
    ? `post:reply:${props.parentId}`
    : "post:new";

  // ── Attachment store ───────────────────────────────────────────────────────
  const attach = createAttachmentStore(currentNick(), scope);

  // ── Local ACL state (not in store — ACL is post-specific) ─────────────────
  const [aclMode, setAclMode] = createSignal<AclMode>(
    props.hideAcl ? "connections" : (props.initialAclMode ?? "connections"),
  );
  const [allowEntries, setAllowEntries] = createSignal<Set<string>>(
    new Set<string>(props.initialAllowEntries),
  );
  const [denyEntries, setDenyEntries] = createSignal<Set<string>>(
    new Set<string>(),
  );
  const [expiry, setExpiry] = createSignal("");
  const [fullscreen, setFullscreen] = createSignal(false);
  const [draftsOpen, setDraftsOpen] = createSignal(false);

  // ── Poll state ─────────────────────────────────────────────────────────────
  const [pollEnabled, setPollEnabled] = createSignal(false);
  const [pollAnswers, setPollAnswers] = createSignal<string[]>(["", ""]);
  const [pollExpireValue, setPollExpireValue] = createSignal("1");
  const [pollExpireUnit, setPollExpireUnit] = createSignal("Days");

  // ── Encrypt state ───────────────────────────────────────────────────────────
  const [encryptOpen, setEncryptOpen] = createSignal(false);
  const [encryptPassword, setEncryptPassword] = createSignal("");
  const [encryptConfirm, setEncryptConfirm] = createSignal("");
  const [encryptHint, setEncryptHint] = createSignal("");
  const [encrypting, setEncrypting] = createSignal(false);
  const [encryptError, setEncryptError] = createSignal("");

  // ── Sync ACL to attachment store ───────────────────────────────────────────
  createEffect(() => {
    const mode = aclMode();
    if (mode === "connections") {
      attach.setAcl(null); // leave files at channel defaults
      return;
    }
    const acl: FileAcl = { allow_cid: [], allow_gid: [], deny_cid: [], deny_gid: [] };
    if (mode === "custom") {
      for (const key of allowEntries()) {
        const [type, ...rest] = key.split(":");
        const xid = rest.join(":");
        if (type === "c") acl.allow_cid.push(xid);
        if (type === "g") acl.allow_gid.push(xid);
      }
      for (const key of denyEntries()) {
        const [type, ...rest] = key.split(":");
        const xid = rest.join(":");
        if (type === "c") acl.deny_cid.push(xid);
        if (type === "g") acl.deny_gid.push(xid);
      }
    }
    // mode === "public": all arrays stay empty (public)
    attach.setAcl(acl);
  });

  // ── Composer store ─────────────────────────────────────────────────────────

  const store = createComposerStore(
    async (body, meta) => {
      // ── Append [attachment] BBCode tags for all attached files/photos ────────
      // Item.php strips these tags from the body and stores them in item.attach.
      // Photos use resource_id (= hash in the attach table) as the identifier.
      // inline via [img] when the user clicks Insert; files always auto-append.
      const fileTags = attach.attachments()
        .filter((a) => a.status === "ready" && (a.hash || a.resourceId))
        .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
        .join("\n");
      const augmentedBody = fileTags ? `${body}\n${fileTags}` : body;

      const csrf = await getCsrfToken();

      // ── Build ACL scope ──
      const mode = aclMode();
      const payload: Record<string, unknown> = {
        body: augmentedBody,
        mimetype: meta.mimetype ?? "text/bbcode",
        profile_uid: props.profileUid,
      };
      if (meta.title) payload.title = meta.title;
      if (meta.summary) payload.summary = meta.summary;
      if (meta.category) payload.category = meta.category;
      if (expiry()) payload.expire = expiry();

      if (mode === "public") {
        payload.scope = "public";
      } else if (mode === "connections") {
        payload.scope = "contacts";
      } else {
        // Custom — require at least one allow entry
        if (allowEntries().size === 0) {
          throw new Error("Select at least one connection or group to allow.");
        }
        payload.scope = "custom";
        const contactAllow: string[] = [];
        const groupAllow: string[] = [];
        const contactDeny: string[] = [];
        const groupDeny: string[] = [];
        for (const key of allowEntries()) {
          const [type, ...rest] = key.split(":");
          const xid = rest.join(":");
          if (type === "c") contactAllow.push(xid);
          if (type === "g") groupAllow.push(xid);
        }
        for (const key of denyEntries()) {
          const [type, ...rest] = key.split(":");
          const xid = rest.join(":");
          if (type === "c") contactDeny.push(xid);
          if (type === "g") groupDeny.push(xid);
        }
        payload.contact_allow = contactAllow;
        payload.group_allow = groupAllow;
        payload.contact_deny = contactDeny;
        payload.group_deny = groupDeny;
      }

      // ── Poll ──
      if (pollEnabled()) {
        const answers = pollAnswers().filter((a) => a.trim());
        if (answers.length < 2)
          throw new Error("At least 2 poll options are required.");
        payload.poll_answers = answers;
        payload.poll_expire_value = pollExpireValue();
        payload.poll_expire_unit = pollExpireUnit();
      }

      const res = await fetch("/api/item", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrf,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        iid?: number;
        mid?: string;
      };
      if (!json.success) {
        throw new Error("Server reported failure. Check Hubzilla logs.");
      }

      props.onPosted?.(json.iid ?? 0);
      attach.clear();
      props.onClose();
    },
    scope,
    { initialBody: props.initialBody },
  );

  // ── ACL helpers ────────────────────────────────────────────────────────────
  function toggleEntry(entry: AclEntry, list: "allow" | "deny") {
    const key = entryKey(entry);
    const [getSet, setSet] =
      list === "allow"
        ? [allowEntries, setAllowEntries]
        : [denyEntries, setDenyEntries];
    const setOther = list === "allow" ? setDenyEntries : setAllowEntries;
    getSet();

    setSet((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setOther((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function clearEntries() {
    setAllowEntries(() => new Set<string>());
    setDenyEntries(() => new Set<string>());
  }

  // ── Multi-category helpers ─────────────────────────────────────────────────
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
      const tags = categoryTags();
      store.setCategory(tags.slice(0, -1).join(","));
    }
  }

  // ── Poll helpers ────────────────────────────────────────────────────────────
  function updatePollAnswer(i: number, val: string) {
    setPollAnswers((prev) => prev.map((a, j) => (j === i ? val : a)));
  }
  function addPollAnswer() {
    if (pollAnswers().length < 10)
      setPollAnswers((prev) => [...prev, ""]);
  }
  function removePollAnswer(i: number) {
    setPollAnswers((prev) => prev.filter((_, j) => j !== i));
  }

  // ── Encrypt ────────────────────────────────────────────────────────────────
  async function doEncrypt() {
    const body = store.body().trim();
    if (!body) { setEncryptError(t("editor.encrypt_error_empty")); return; }
    if (isEncryptedBody(body)) { setEncryptError(t("editor.encrypt_error_already")); return; }
    const pw = encryptPassword().trim();
    const confirm = encryptConfirm().trim();
    if (!pw) { setEncryptError(t("editor.encrypt_error_no_password")); return; }
    if (pw !== confirm) { setEncryptError(t("editor.encrypt_error_mismatch")); return; }

    setEncrypting(true);
    setEncryptError("");
    try {
      const encrypted = await encryptBody(body, pw, encryptHint().trim());
      store.setBody(encrypted);
      setEncryptOpen(false);
      setEncryptPassword("");
      setEncryptConfirm("");
      setEncryptHint("");
    } catch (err) {
      setEncryptError(err instanceof Error ? err.message : "Encryption failed");
    } finally {
      setEncrypting(false);
    }
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetAll() {
    store.reset();
    attach.clear();
    setAclMode("connections");
    setAllowEntries(() => new Set<string>());
    setDenyEntries(() => new Set<string>());
    setExpiry("");
    setPollEnabled(false);
    setPollAnswers(["", ""]);
    setPollExpireValue("1");
    setPollExpireUnit("Days");
    setPendingCategory("");
    setEncryptOpen(false);
    setEncryptPassword("");
    setEncryptConfirm("");
    setEncryptHint("");
    setEncryptError("");
  }

  // ── Mention + emoji autocomplete ──────────────────────────────────────────
  const mention = useMention();
  const emoji   = useEmoji();
  let editorWrapRef: HTMLDivElement | undefined;

  const getEditor = () =>
    editorWrapRef?.querySelector<HTMLDivElement>("[contenteditable]") ?? null;
  const getTA = () =>
    editorWrapRef?.querySelector<HTMLTextAreaElement>("textarea") ?? null;

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

  function insertMentionSelected() {
    const entry = mention.filtered()[mention.activeIdx()];
    if (!entry) return;
    const editor = getEditor();
    if (editor) { mention.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); return; }
    const ta = getTA();
    if (ta) mention.insertTextarea(entry, ta, store.setBody);
  }

  function insertEmojiSelected() {
    const entry = emoji.filtered()[emoji.activeIdx()];
    if (!entry) return;
    const editor = getEditor();
    if (editor) { emoji.insertWysiwyg(entry, () => store.setBody(editor.innerHTML)); return; }
    const ta = getTA();
    if (ta) emoji.insertTextarea(entry, ta, store.setBody);
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  function onKey(e: KeyboardEvent) {
    if (mention.open()) {
      const consumed = mention.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") insertMentionSelected();
        return;
      }
      if (e.key === "Escape") return;
    }
    if (emoji.open()) {
      const consumed = emoji.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") insertEmojiSelected();
        return;
      }
      if (e.key === "Escape") return;
    }
    if (e.key === "Escape") {
      props.onClose();
      return;
    }
    if (e.ctrlKey && e.key === "Enter") {
      void store.submit();
    }
  }

  createEffect(() => {
    if (props.open) document.addEventListener("keydown", onKey);
    else document.removeEventListener("keydown", onKey);
  });
  onCleanup(() => document.removeEventListener("keydown", onKey));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Show when={props.open}>
      <Portal mount={document.body}>
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          use:helpable="shared/post-composer"
          onClick={(e) => {
            if (e.target === e.currentTarget) props.onClose();
          }}
        >
          <div
            class={
              "flex flex-col bg-surface border border-rim " +
              "shadow-2xl text-txt overflow-hidden " +
              (fullscreen()
                ? "fixed inset-0 w-full rounded-none"
                : "w-full max-w-2xl h-[90vh] rounded-xl")
            }
            role="dialog"
            aria-modal="true"
            aria-label={t("editor.composer_label")}
          >
            {/* ── Header ── */}
            <header class="flex items-center justify-between px-4 py-3 border-b border-rim shrink-0">
              <span class="text-xs font-semibold tracking-widest uppercase text-muted select-none">
                {props.parentId ? t("editor.reply_header") : t("editor.new_post")}
              </span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  title={fullscreen() ? t("editor.fullscreen_exit") : t("editor.fullscreen_enter")}
                  onClick={() => setFullscreen((f) => !f)}
                  class="p-1.5 rounded-md text-muted hover:text-txt hover:bg-elevated transition-colors"
                >
                  <Show
                    when={fullscreen()}
                    fallback={
                      <svg
                        class="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                    }
                  >
                    <svg
                      class="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                    </svg>
                  </Show>
                </button>
                <button
                  type="button"
                  title={t("editor.close_esc")}
                  onClick={props.onClose}
                  class="p-1.5 rounded-md text-muted hover:text-txt hover:bg-elevated transition-colors"
                >
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </header>

            {/* ── Meta fields (title) ── */}
            <Show when={caps.title}>
              <div class="flex gap-2 px-4 pt-3 pb-2 border-b border-rim shrink-0">
                <Show when={caps.title}>
                  <input
                    type="text"
                    placeholder={t("editor.title_placeholder")}
                    value={store.title()}
                    onInput={(e) => store.setTitle(e.currentTarget.value)}
                    class="flex-1 min-w-0 bg-transparent text-sm font-medium text-txt
                           placeholder:text-muted outline-none"
                  />
                </Show>
              </div>
            </Show>

            {/* ── Summary ── */}
            <Show when={caps.summary && !props.parentId}>
              <div class="px-4 py-2 border-b border-rim shrink-0">
                <input
                  type="text"
                  placeholder={t("editor.post_summary_placeholder")}
                  value={store.summary()}
                  onInput={(e) => store.setSummary(e.currentTarget.value)}
                  class="w-full bg-transparent text-sm text-txt placeholder:text-muted outline-none"
                />
              </div>
            </Show>

            {/* ── Category ── */}
            <Show when={caps.category && !props.parentId}>
              <div class="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-rim shrink-0">
                <For each={categoryTags()}>
                  {(tag) => (
                    <span class="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-elevated text-xs text-txt">
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
                  placeholder={categoryTags().length ? "" : t("editor.category_placeholder")}
                  value={pendingCategory()}
                  onInput={(e) => setPendingCategory(e.currentTarget.value)}
                  onKeyDown={onCategoryKeyDown}
                  onBlur={() => { if (pendingCategory().trim()) addCategoryTag(pendingCategory()); }}
                  class="flex-1 min-w-0 bg-transparent text-sm text-txt placeholder:text-muted outline-none"
                />
              </div>
            </Show>

            {/* ── Drafts panel ── */}
            <Show when={draftsOpen()}>
              <DraftsList
                drafts={store.savedDrafts()}
                onLoad={(d) => { store.loadSavedDraft(d); setDraftsOpen(false); }}
                onDelete={(id) => void store.deleteSavedDraft(id)}
                onClose={() => setDraftsOpen(false)}
              />
            </Show>

            {/* ── Editor area (flex-1) ── */}
            <div ref={editorWrapRef} class="flex-1 overflow-hidden min-h-0 flex flex-col">
              <RichEditor
                body={store.body()}
                onInput={store.setBody}
                capabilities={caps}
                tab={store.tab()}
                onTabChange={store.setTab}
                mimetype={store.mimetype()}
                onCtrlEnter={() => { if (!mention.open()) void store.submit(); }}
                placeholder={props.parentId ? t("editor.write_reply_placeholder") : t("editor.write_placeholder")}
                minHeight="200px"
              />
              <AttachmentBar
                store={attach}
                nick={currentNick()}
                accept="both"
                onInsert={(bbcode) => {
                  store.setBody(store.body() + "\n" + bbcodeToInsert(bbcode, store.mimetype()));
                }}
              />
            </div>

            {/* ── Poll panel ── */}
            <Show when={pollEnabled()}>
              <div class="px-4 py-3 border-t border-rim bg-elevated/40 shrink-0 space-y-2">
                <span class="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                  {t("editor.poll_toggle")}
                </span>
                <For each={pollAnswers()}>
                  {(ans, i) => (
                    <div class="flex items-center gap-2">
                      <input
                        type="text"
                        value={ans}
                        placeholder={`${t("editor.poll_answer_placeholder")} ${i() + 1}`}
                        onInput={(e) => updatePollAnswer(i(), e.currentTarget.value)}
                        class="flex-1 bg-transparent border border-rim rounded px-2.5 py-1 text-sm
                               text-txt placeholder:text-muted outline-none focus:border-rim-strong transition-colors"
                      />
                      <Show when={pollAnswers().length > 2}>
                        <button
                          type="button"
                          onClick={() => removePollAnswer(i())}
                          title={t("editor.poll_remove_answer")}
                          class="p-1 rounded text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      class="text-xs text-accent hover:opacity-80 transition-opacity"
                    >
                      {t("editor.poll_add_answer")}
                    </button>
                  </Show>
                  <div class="flex items-center gap-1.5 ml-auto">
                    <span class="text-xs text-muted shrink-0">{t("editor.poll_expires_label")}</span>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={pollExpireValue()}
                      onInput={(e) => setPollExpireValue(e.currentTarget.value)}
                      class="w-14 bg-transparent border border-rim rounded px-2 py-0.5 text-xs text-txt
                             outline-none focus:border-rim-strong transition-colors"
                    />
                    <select
                      value={pollExpireUnit()}
                      onChange={(e) => setPollExpireUnit(e.currentTarget.value)}
                      class="bg-surface border border-rim rounded px-1.5 py-0.5 text-xs text-txt
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

            {/* ── Encrypt panel ── */}
            <Show when={encryptOpen()}>
              <div class="px-4 py-3 border-t border-rim bg-elevated/40 shrink-0 space-y-2">
                <span class="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">
                  {t("editor.encrypt_panel_title")}
                </span>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div class="flex flex-col gap-0.5">
                    <label class="text-xs text-muted">{t("editor.encrypt_password_label")}</label>
                    <input
                      type="password"
                      placeholder={t("editor.encrypt_password_placeholder")}
                      value={encryptPassword()}
                      onInput={(e) => setEncryptPassword(e.currentTarget.value)}
                      class="bg-transparent border border-rim rounded px-2.5 py-1 text-sm text-txt
                             placeholder:text-muted outline-none focus:border-rim-strong transition-colors"
                    />
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <label class="text-xs text-muted">{t("editor.encrypt_confirm_label")}</label>
                    <input
                      type="password"
                      placeholder={t("editor.encrypt_confirm_placeholder")}
                      value={encryptConfirm()}
                      onInput={(e) => setEncryptConfirm(e.currentTarget.value)}
                      class="bg-transparent border border-rim rounded px-2.5 py-1 text-sm text-txt
                             placeholder:text-muted outline-none focus:border-rim-strong transition-colors"
                    />
                  </div>
                </div>
                <div class="flex flex-col gap-0.5">
                  <label class="text-xs text-muted">{t("editor.encrypt_hint_label")}</label>
                  <input
                    type="text"
                    placeholder={t("editor.encrypt_hint_placeholder")}
                    value={encryptHint()}
                    onInput={(e) => setEncryptHint(e.currentTarget.value)}
                    class="w-full bg-transparent border border-rim rounded px-2.5 py-1 text-sm text-txt
                           placeholder:text-muted outline-none focus:border-rim-strong transition-colors"
                  />
                </div>
                <Show when={encryptError()}>
                  <p class="text-red-400 text-xs">{encryptError()}</p>
                </Show>
                <div class="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={encrypting()}
                    onClick={() => void doEncrypt()}
                    class="px-3 py-1 rounded-md text-xs font-semibold bg-accent text-accent-fg hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {encrypting() ? t("editor.encrypt_encrypting") : t("editor.encrypt_btn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEncryptOpen(false); setEncryptError(""); }}
                    class="px-3 py-1 rounded-md text-xs text-muted hover:text-txt hover:bg-elevated transition-colors"
                  >
                    {t("editor.encrypt_cancel")}
                  </button>
                </div>
              </div>
            </Show>

            {/* ── Footer ── */}
            <footer class="flex flex-wrap items-center gap-2 px-3.5 py-2.5 border-t border-rim bg-elevated shrink-0">
              {/* ACL Picker — hidden for visitors posting to another channel's wall */}
              <Show
                when={!props.hideAcl}
                fallback={
                  <span class="text-xs text-muted px-1">{t("editor.posting_to_wall")}</span>
                }
              >
                <AclPicker
                  mode={aclMode()}
                  onModeChange={setAclMode}
                  allowEntries={allowEntries()}
                  denyEntries={denyEntries()}
                  onToggle={toggleEntry}
                  onClear={clearEntries}
                />
              </Show>

              {/* Expiry — gated behind Settings → Features → Content Expiration */}
              <Show when={isFeatureEnabled("content_expire") && !props.parentId}>
                <div class="hidden sm:flex items-center gap-1.5 min-w-0">
                  <span class="text-muted text-xs shrink-0" title="Post expiry">⏱</span>
                  <input
                    type="datetime-local"
                    value={expiry()}
                    onChange={(e) => setExpiry(e.currentTarget.value)}
                    class="bg-transparent border border-rim rounded px-1.5 py-0.5 text-xs text-muted focus:outline-none focus:border-rim-strong focus:text-txt transition-colors"
                  />
                </div>
              </Show>

              {/* Poll toggle */}
              <Show when={!props.parentId}>
                <button
                  type="button"
                  onClick={() => setPollEnabled((p) => !p)}
                  title={t("editor.poll_toggle")}
                  class={
                    "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors " +
                    (pollEnabled()
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "text-muted hover:text-txt hover:bg-elevated border-rim")
                  }
                >
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {t("editor.poll_toggle")}
                </button>
              </Show>

              {/* Encrypt toggle — gated behind Settings → Features → Content Encryption */}
              <Show when={isFeatureEnabled("content_encrypt") && !props.parentId}>
                <Show
                  when={!isEncryptedBody(store.body())}
                  fallback={
                    <span class="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md text-xs border bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                      🔒 {t("editor.encrypt_badge")}
                    </span>
                  }
                >
                  <button
                    type="button"
                    onClick={() => { setEncryptOpen((o) => !o); setEncryptError(""); }}
                    title={t("editor.encrypt_toggle")}
                    class={
                      "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors " +
                      (encryptOpen()
                        ? "bg-accent/10 text-accent border-accent/30"
                        : "text-muted hover:text-txt hover:bg-elevated border-rim")
                    }
                  >
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    {t("editor.encrypt_toggle")}
                  </button>
                </Show>
              </Show>

              {/* Character count + draft controls + reset + submit */}
              <div class="flex items-center gap-3 ml-auto shrink-0">
                <span class="font-mono text-xs tabular-nums text-muted">
                  {store.body().length}
                </span>
                <Show when={store.savedDrafts().length > 0}>
                  <button
                    type="button"
                    title={t("editor.saved_drafts")}
                    onClick={() => setDraftsOpen((o) => !o)}
                    class={
                      "px-2 py-1 rounded-md text-xs transition-colors " +
                      (draftsOpen()
                        ? "bg-elevated text-txt"
                        : "text-muted hover:text-txt hover:bg-elevated")
                    }
                  >
                    {t("editor.drafts_btn", { count: store.savedDrafts().length })}
                  </button>
                </Show>
                <Show when={store.body().trim()}>
                  <button
                    type="button"
                    onClick={() => void store.saveAsDraft()}
                    class="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rim text-xs text-muted hover:text-txt hover:bg-elevated transition-colors"
                  >
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3v5H9V3m0 14h6" />
                    </svg>
                    {t("editor.save_draft")}
                  </button>
                  <button
                    type="button"
                    title={t("editor.clear_composer")}
                    onClick={resetAll}
                    class="p-1.5 rounded-md text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Show>
                <button
                  type="button"
                  disabled={store.submitting() || attach.uploading()}
                  onClick={() => void store.submit()}
                  class="px-5 py-1.5 rounded-lg text-sm font-semibold bg-accent text-accent-fg hover:opacity-90 active:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {store.submitting() ? t("editor.posting") : t("editor.post_btn")}
                </button>
              </div>
            </footer>

          </div>
        </div>

        {/* ── Mention popup ── */}
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

        {/* ── Emoji popup ── */}
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
      </Portal>
    </Show>
  );
};

export default PostComposer;
