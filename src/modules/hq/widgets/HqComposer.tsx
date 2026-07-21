import { createSignal, createEffect, onCleanup, Show, For, type JSX } from "solid-js";
import { MdOutlineLink } from "solid-icons/md";
import { toast } from "@/shared/store/toast";
import { useAuth } from "@/shared/store/auth-store";
import { motion } from "solid-motionone";
import PostComposer from "@/shared/editor/composers/PostComposer";
import AclPicker, { entryKey, type AclMode, type AclEntry } from "@/shared/editor/components/AclPicker";
import { storageGet, storageSet, storageDel } from "@/shared/lib/storage";
import { getCsrfToken } from "@/shared/lib/csrf";
import { useMention, getTextareaMentionQuery } from "@/shared/editor/mention/useMention";
import MentionPopup from "@/shared/editor/mention/MentionPopup";
import { useI18n } from "@/i18n";
void motion;

const DRAFT_KEY = "hz_hq_draft";

function insertBb(
  ta: HTMLTextAreaElement,
  open: string,
  close: string,
  placeholder = "…",
): { value: string; cursor: number } {
  const s = ta.selectionStart;
  const e = ta.selectionEnd;
  const sel = ta.value.slice(s, e) || placeholder;
  const value = ta.value.slice(0, s) + open + sel + close + ta.value.slice(e);
  return { value, cursor: s + open.length + sel.length + close.length };
}

export default function HqComposerSlot() {
  const auth = useAuth();
  return (
    <Show when={!auth.loading && auth()?.isLocal}>
      <HqComposer />
    </Show>
  );
}

function HqComposer() {
  const { t } = useI18n();
  const auth = useAuth();
  const [body, setBody] = createSignal("");
  const [aclMode, setAclMode] = createSignal<AclMode>("connections");
  const [allowKeys, setAllowKeys] = createSignal<Set<string>>(new Set<string>());
  const [denyKeys, setDenyKeys] = createSignal<Set<string>>(new Set<string>());
  const [submitting, setSubmitting] = createSignal(false);
  const [fullOpen, setFullOpen] = createSignal(false);

  // Load draft on mount
  storageGet<{ body?: string; aclMode?: string }>(DRAFT_KEY, {}).then((d) => {
    if (d.body && !body()) { setBody(d.body); requestAnimationFrame(() => autoResize()); }
    if (d.aclMode) setAclMode((d.aclMode as AclMode) ?? "connections");
  });

  // Auto-save draft
  let draftTimer: ReturnType<typeof setTimeout> | undefined;
  createEffect(() => {
    const snap = { body: body(), aclMode: aclMode() };
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => storageSet(DRAFT_KEY, snap), 800);
  });
  onCleanup(() => clearTimeout(draftTimer));

  let taRef!: HTMLTextAreaElement;

  // ── Mention autocomplete ──────────────────────────────────────────────────
  const mention = useMention();

  createEffect(() => {
    void body();
    const q = getTextareaMentionQuery(taRef);
    if (q !== null) {
      mention.openWithQuery(q, taRef.getBoundingClientRect());
    } else {
      mention.close();
    }
  });

  function onKeyDown(e: KeyboardEvent) {
    if (!mention.open()) return;
    const consumed = mention.onKeyDown(e);
    if (consumed && (e.key === "Enter" || e.key === "Tab")) {
      const entry = mention.filtered()[mention.activeIdx()];
      if (entry) mention.insertTextarea(entry, taRef, setBody);
    }
  }

  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  function wrapBb(open: string, close: string, placeholder = "…") {
    const { value, cursor } = insertBb(taRef, open, close, placeholder);
    setBody(value);
    requestAnimationFrame(() => {
      taRef.focus();
      taRef.setSelectionRange(cursor, cursor);
    });
  }

  function autoResize() {
    taRef.style.height = "auto";
    taRef.style.height = Math.min(taRef.scrollHeight, 480) + "px";
  }

  function toggleEntry(entry: AclEntry, list: "allow" | "deny") {
    const key = entryKey(entry);
    if (list === "allow") {
      setAllowKeys((prev) => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      setDenyKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    } else {
      setDenyKeys((prev) => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        return next;
      });
      setAllowKeys((prev) => { const next = new Set(prev); next.delete(key); return next; });
    }
  }

  async function handleSubmit() {
    if (!body().trim()) return;
    setSubmitting(true);

    const mode = aclMode();
    const payload: Record<string, unknown> = {
      body: body(),
      mimetype: "text/bbcode",
      profile_uid: auth()!.uid,
    };

    if (mode === "public") {
      payload.scope = "public";
    } else if (mode === "connections") {
      payload.scope = "contacts";
    } else {
      if (allowKeys().size === 0) {
        toast.error("Select at least one connection to allow.");
        setSubmitting(false);
        return;
      }
      payload.scope = "custom";
      const contactAllow: string[] = [];
      const groupAllow: string[] = [];
      const contactDeny: string[] = [];
      const groupDeny: string[] = [];
      for (const key of allowKeys()) {
        const [type, ...rest] = key.split(":");
        const xid = rest.join(":");
        if (type === "c") contactAllow.push(xid);
        if (type === "g") groupAllow.push(xid);
      }
      for (const key of denyKeys()) {
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

    try {
      const csrf = await getCsrfToken();
      const res = await fetch("/spa/item", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => ({})) as { data?: { post?: unknown } };
      if (!json.data?.post) { toast.error("Server reported failure."); return; }
      toast.success(t("editor.post_published"));
      resetComposer();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetComposer() {
    setBody("");
    setAllowKeys(new Set<string>());
    setDenyKeys(new Set<string>());
    setAclMode("connections");
    if (taRef) taRef.style.height = "auto";
    storageDel(DRAFT_KEY);
  }

  const toolbar = [
    { title: () => t("editor.hq_bold"),    label: "B",  cls: "font-bold", action: () => wrapBb("[b]", "[/b]") },
    { title: () => t("editor.hq_italic"),  label: "I",  cls: "italic",    action: () => wrapBb("[i]", "[/i]") },
    { title: () => t("editor.hq_underline"), label: "U", cls: "underline", action: () => wrapBb("[u]", "[/u]") },
    { title: () => t("editor.hq_link"),    label: <MdOutlineLink class="w-4 h-4" /> as JSX.Element, cls: "",          action: () => {
      const url = window.prompt("URL:", "https://");
      if (url) wrapBb(`[url=${url}]`, "[/url]", "Link text");
    }},
  ];

  return (
    <div class="bg-surface border border-rim rounded-2xl p-3.5 shadow-sm flex flex-col">

      {/* Header */}
      <div class="mb-2.5">
        <span class="text-xs font-medium uppercase tracking-wider text-muted">
          {t("hq.post_composer")}
        </span>
      </div>

      {/* Body area — grows to fill card height */}
      <div class="flex gap-2.5 flex-1 min-h-[84px]">
        <Show when={auth()?.nick}>
          <div class="w-7 h-7 rounded-full bg-accent-muted text-accent flex items-center
                      justify-center text-sm font-bold shrink-0 mt-0.5 select-none">
            {auth()!.nick[0].toUpperCase()}
          </div>
        </Show>
        <textarea
          ref={taRef!}
          placeholder={t("editor.write_placeholder")}
          value={body()}
          onInput={(e) => { setBody(e.currentTarget.value); autoResize(); }}
          rows={3}
          class="flex-1 resize-none bg-transparent text-sm text-txt placeholder:text-muted
                 focus:outline-none leading-relaxed overflow-hidden w-full"
        />
      </div>

      {/* Toolbar row */}
      <div class="flex items-center gap-0.5 mt-1.5 pt-1.5 border-t border-rim">
        <For each={toolbar}>
          {(btn) => (
            <button
              type="button"
              title={btn.title()}
              onMouseDown={(e) => { e.preventDefault(); btn.action(); }}
              class={`w-7 h-7 flex items-center justify-center rounded text-xs text-muted
                      hover:bg-elevated hover:text-txt transition-colors ${btn.cls}`}
            >
              {btn.label}
            </button>
          )}
        </For>

        {/* Reset */}
        <Show when={body().trim()}>
          <button
            type="button"
            title={t("editor.clear_composer")}
            onClick={resetComposer}
            class="ml-auto w-7 h-7 flex items-center justify-center rounded text-muted
                   hover:bg-elevated hover:text-red-500 transition-colors"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Show>

        {/* Open full composer */}
        <button
          type="button"
          title={t("editor.open_full_composer")}
          onClick={() => setFullOpen(true)}
          class="w-7 h-7 flex items-center justify-center rounded text-muted
                 hover:bg-elevated hover:text-txt transition-colors"
          classList={{ "ml-auto": !body().trim() }}
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>

      {/* ACL + submit row */}
      <div class="flex items-center gap-1 mt-1.5 flex-wrap">
        <AclPicker
          mode={aclMode()}
          onModeChange={setAclMode}
          allowEntries={allowKeys()}
          denyEntries={denyKeys()}
          onToggle={toggleEntry}
          onClear={() => { setAllowKeys(new Set<string>()); setDenyKeys(new Set<string>()); }}
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting() || !body().trim()}
          class="ml-auto px-4 py-1 rounded-lg text-xs font-semibold bg-accent text-accent-fg
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {submitting() ? t("editor.posting") : t("editor.post_btn")}
        </button>
      </div>

      {/* Mention popup */}
      <Show when={mention.open() && mention.rect() !== null}>
        <MentionPopup
          query={mention.query()!}
          entries={mention.filtered()}
          anchorRect={mention.rect()!}
          activeIdx={mention.activeIdx()}
          onSelect={(entry) => mention.insertTextarea(entry, taRef, setBody)}
        />
      </Show>

      {/* Full composer modal — remounts on open so initialBody/initialAclMode capture current state */}
      <Show when={fullOpen()}>
        <PostComposer
          profileUid={auth()!.uid}
          open={true}
          onClose={() => setFullOpen(false)}
          initialBody={body()}
          initialAclMode={aclMode()}
          initialAllowEntries={allowKeys()}
          onPosted={() => resetComposer()}
        />
      </Show>
    </div>
  );
}
