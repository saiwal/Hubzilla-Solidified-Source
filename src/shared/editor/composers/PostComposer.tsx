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
import { Portal } from "solid-js/web";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import AclPicker, { entryKey } from "../components/AclPicker";
import type { AclMode } from "../components/AclPicker";
import type { AclEntry } from "@/modules/network/api";
import { helpable } from "@/shared/lib/helpable";
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

  // ── Composer store ─────────────────────────────────────────────────────────
  const scope = props.parentId
    ? `post:reply:${props.parentId}`
    : "post:new";

  const store = createComposerStore(
    async (body, meta) => {
      const fd = new FormData();
      fd.append("body", body);
      fd.append("mimetype", meta.mimetype ?? "text/bbcode");
      fd.append("obj_type", "Note");
      fd.append("profile_uid", String(props.profileUid));
      fd.append("type", props.parentId ? "net-comment" : "wall");
      if (props.parentId) fd.append("parent", String(props.parentId));
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
    setAclMode("connections");
    setAllowEntries(() => new Set<string>());
    setDenyEntries(() => new Set<string>());
    setExpiry("");
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  function onKey(e: KeyboardEvent) {
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
              "flex flex-col bg-white dark:bg-gray-900 border border-rim " +
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
              <span class="text-xs font-semibold tracking-widest uppercase text-gray-400 dark:text-gray-500 select-none">
                {props.parentId ? "Reply" : "New Post"}
              </span>
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  title={fullscreen() ? "Exit fullscreen" : "Fullscreen"}
                  onClick={() => setFullscreen((f) => !f)}
                  class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                  class="p-1.5 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

            {/* ── Editor area (flex-1) ── */}
            <div class="flex-1 overflow-hidden min-h-0 flex flex-col">
              <RichEditor
                body={store.body()}
                onInput={store.setBody}
                capabilities={caps}
                tab={store.tab()}
                onTabChange={store.setTab}
                onCtrlEnter={() => void store.submit()}
                placeholder={props.parentId ? "Write a reply…" : "What's on your mind?"}
                minHeight="200px"
              />
            </div>

            {/* ── Footer ── */}
            <footer class="flex flex-wrap items-center gap-2 px-3.5 py-2.5 border-t border-rim bg-gray-50 dark:bg-gray-800/40 shrink-0">
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
                  class="text-gray-400 dark:text-gray-500 text-xs shrink-0"
                  title="Post expiry"
                >
                  ⏱
                </span>
                <input
                  type="datetime-local"
                  value={expiry()}
                  onInput={(e) => setExpiry(e.currentTarget.value)}
                  class="bg-transparent border border-rim rounded px-1.5 py-0.5 text-xs text-gray-400 dark:text-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 focus:text-gray-700 dark:focus:text-gray-300 transition-colors"
                />
              </div>

              {/* Character count + reset + submit */}
              <div class="flex items-center gap-3 ml-auto shrink-0">
                <span class="font-mono text-xs tabular-nums text-gray-400 dark:text-gray-500">
                  {store.body().length}
                </span>
                <Show when={store.body().trim()}>
                  <button
                    type="button"
                    title="Clear composer"
                    onClick={resetAll}
                    class="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </Show>
                <button
                  type="button"
                  disabled={store.submitting()}
                  onClick={() => void store.submit()}
                  class="px-5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
      </Portal>
    </Show>
  );
};

export default PostComposer;
