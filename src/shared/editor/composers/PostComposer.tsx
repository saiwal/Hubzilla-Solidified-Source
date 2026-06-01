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
 * - Submits to POST /item (Hubzilla Item::post())
 */

import {
  createSignal,
  createEffect,
  onCleanup,
  Show,
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
import { helpable } from "@/shared/lib/helpable";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { currentNick } from "@/shared/store/auth-store";
import { bbcodeToInsert } from "../attachments/insertHelpers";
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
}

// ─── Component ────────────────────────────────────────────────────────────────

const PostComposer: Component<ComposerProps> = (props) => {
  const caps = CAPABILITIES.post;

  // ── Scope (shared by both stores for matching IDB keys) ───────────────────
  const scope = props.parentId
    ? `post:reply:${props.parentId}`
    : "post:new";

  // ── Attachment store ───────────────────────────────────────────────────────
  const attach = createAttachmentStore(currentNick(), scope);

  // ── Local ACL state (not in store — ACL is post-specific) ─────────────────
  const [aclMode, setAclMode] = createSignal<AclMode>(
    props.initialAclMode ?? "connections",
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

      const fd = new FormData();
      fd.append("body", augmentedBody);
      fd.append("mimetype", meta.mimetype ?? "text/bbcode");
      fd.append("obj_type", "Note");
      fd.append("profile_uid", String(props.profileUid));
      fd.append("type", props.parentId ? "net-comment" : "wall");
      if (props.parentId) fd.append("parent", String(props.parentId));
      if (meta.title) fd.append("title", meta.title);
      if (meta.category) fd.append("category", meta.category);
      if (expiry()) fd.append("expire", expiry());
      fd.append("return", "");

      // ── ACL ──
      const mode = aclMode();
      if (mode === "public") {
        fd.append("contact_allow", "");
        fd.append("group_allow", "");
        fd.append("contact_deny", "");
        fd.append("group_deny", "");
        fd.append("public_policy", "");
      } else if (mode === "connections") {
        fd.append("contact_allow", "");
        fd.append("group_allow", "");
        fd.append("contact_deny", "");
        fd.append("group_deny", "");
        fd.append("public_policy", "contacts");
      } else {
        // Custom — require at least one allow entry
        if (allowEntries().size === 0) {
          throw new Error("Select at least one connection or group to allow.");
        }
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json().catch(() => ({}))) as {
        success?: number;
        cancel?: number;
        id?: number;
      };
      if (json.cancel) {
        throw new Error("Post cancelled by server (duplicate or plugin).");
      }
      if (!json.success) {
        throw new Error("Server reported failure. Check Hubzilla logs.");
      }

      props.onPosted?.(json.id ?? 0);
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

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetAll() {
    store.reset();
    attach.clear();
    setAclMode("connections");
    setAllowEntries(() => new Set<string>());
    setDenyEntries(() => new Set<string>());
    setExpiry("");
  }

  // ── Mention autocomplete ───────────────────────────────────────────────────
  const mention = useMention();
  let editorWrapRef: HTMLDivElement | undefined;

  const getEditor = () =>
    editorWrapRef?.querySelector<HTMLDivElement>("[contenteditable]") ?? null;
  const getTA = () =>
    editorWrapRef?.querySelector<HTMLTextAreaElement>("textarea") ?? null;

  createEffect(() => {
    void store.body();
    const editor = getEditor();
    if (editor) {
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

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  function onKey(e: KeyboardEvent) {
    if (mention.open()) {
      const consumed = mention.onKeyDown(e);
      if (consumed) {
        if (e.key === "Enter" || e.key === "Tab") insertSelected();
        return;
      }
      // mention.onKeyDown calls stopPropagation on Escape — but we're in a
      // direct listener so we must check the return value to avoid closing modal
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
                ? "fixed inset-0 w-full max-h-full rounded-none"
                : "w-full max-w-2xl max-h-[90vh] rounded-xl")
            }
            role="dialog"
            aria-modal="true"
            aria-label="Post composer"
          >
            {/* ── Header ── */}
            <header class="flex items-center justify-between px-4 py-3 border-b border-rim shrink-0">
              <span class="text-xs font-semibold tracking-widest uppercase text-muted select-none">
                {props.parentId ? "Reply" : "New Post"}
              </span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  title={fullscreen() ? "Exit fullscreen" : "Fullscreen"}
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
                  title="Close (Esc)"
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

            {/* ── Meta fields (title / category) ── */}
            <Show when={caps.title || caps.category}>
              <div class="flex gap-2 px-4 pt-3 pb-2 border-b border-rim shrink-0">
                <Show when={caps.title}>
                  <input
                    type="text"
                    placeholder="Title (optional)"
                    value={store.title()}
                    onInput={(e) => store.setTitle(e.currentTarget.value)}
                    class="flex-1 min-w-0 bg-transparent text-sm font-medium text-txt
                           placeholder:text-muted outline-none"
                  />
                </Show>
                <Show when={caps.category}>
                  <input
                    type="text"
                    placeholder="Category"
                    value={store.category()}
                    onInput={(e) => store.setCategory(e.currentTarget.value)}
                    class="w-32 shrink-0 bg-transparent text-sm text-txt
                           placeholder:text-muted outline-none border-l border-rim pl-2"
                  />
                </Show>
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
                placeholder={props.parentId ? "Write a reply…" : "What's on your mind?"}
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

            {/* ── Footer ── */}
            <footer class="flex flex-wrap items-center gap-2 px-3.5 py-2.5 border-t border-rim bg-elevated shrink-0">
              {/* Format picker */}
              <select
                value={store.mimetype()}
                onChange={(e) =>
                  store.setMimetype(e.currentTarget.value as import("../types/editor.types").MimeType)
                }
                class="text-xs px-2 py-1 rounded border border-rim bg-surface text-txt"
                title="Input format"
              >
                <option value="text/bbcode">BBCode</option>
                <option value="text/markdown">Markdown</option>
                <option value="text/html">HTML</option>
              </select>

              {/* ACL Picker */}
              <AclPicker
                mode={aclMode()}
                onModeChange={setAclMode}
                allowEntries={allowEntries()}
                denyEntries={denyEntries()}
                onToggle={toggleEntry}
                onClear={clearEntries}
              />

              {/* Expiry */}
              <div class="hidden sm:flex items-center gap-1.5 min-w-0">
                <span
                  class="text-muted text-xs shrink-0"
                  title="Post expiry"
                >
                  ⏱
                </span>
                <input
                  type="datetime-local"
                  value={expiry()}
                  onInput={(e) => setExpiry(e.currentTarget.value)}
                  class="bg-transparent border border-rim rounded px-1.5 py-0.5 text-xs text-muted focus:outline-none focus:border-rim-strong focus:text-txt transition-colors"
                />
              </div>

              {/* Character count + draft controls + reset + submit */}
              <div class="flex items-center gap-3 ml-auto shrink-0">
                <span class="font-mono text-xs tabular-nums text-muted">
                  {store.body().length}
                </span>
                <Show when={store.savedDrafts().length > 0}>
                  <button
                    type="button"
                    title="Saved drafts"
                    onClick={() => setDraftsOpen((o) => !o)}
                    class={
                      "px-2 py-1 rounded-md text-xs transition-colors " +
                      (draftsOpen()
                        ? "bg-elevated text-txt"
                        : "text-muted hover:text-txt hover:bg-elevated")
                    }
                  >
                    Drafts ({store.savedDrafts().length})
                  </button>
                </Show>
                <Show when={store.body().trim()}>
                  <button
                    type="button"
                    title="Save as draft"
                    onClick={() => void store.saveAsDraft()}
                    class="p-1.5 rounded-md text-muted hover:text-txt hover:bg-elevated transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3v5H9V3m0 14h6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    title="Clear composer"
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
                  {store.submitting() ? "Posting…" : "Post"}
                </button>
              </div>
            </footer>

            {/* ── Error bar ── */}
            <Show when={store.error()}>
              <div class="px-4 py-2 text-sm text-red-500 bg-red-500/10 border-t border-red-500/30 shrink-0">
                {store.error()}
              </div>
            </Show>
          </div>
        </div>

        {/* ── Mention popup (its own Portal → floats above the modal) ── */}
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
      </Portal>
    </Show>
  );
};

export default PostComposer;
