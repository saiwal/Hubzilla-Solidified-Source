import { createSignal, createResource, createEffect, onCleanup, Show, For } from "solid-js";
import { Portal } from "solid-js/web";
import { useAuth } from "@/shared/store/auth-store";
import { fetchConnections } from "@/modules/network/api";
import type { AclEntry } from "@/modules/network/api";
import { useDropdown } from "@/shared/lib/useDropdown";
import { motion } from "solid-motionone";
import PostComposer from "@/shared/editor/composers/PostComposer";
import { storageGet, storageSet, storageDel } from "@/shared/lib/storage";
void motion;

const DRAFT_KEY = "hz_hq_draft";

type AclMode = "public" | "connections" | "custom";

function entryKey(e: AclEntry): string {
  return `${e.type}:${e.xid}`;
}

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
  const auth = useAuth();
  const [body, setBody] = createSignal("");
  const [aclMode, setAclMode] = createSignal<AclMode>("connections");
  const [allowKeys, setAllowKeys] = createSignal<Set<string>>(new Set());
  const [connQuery, setConnQuery] = createSignal("");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");
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

  // Only fetch connections when custom mode has been opened at least once
  const [fetchEnabled, setFetchEnabled] = createSignal(false);
  const [connections] = createResource(fetchEnabled, fetchConnections);

  const { open: aclOpen, setOpen: setAclOpen, toggle: toggleAcl, floatStyle, setTriggerRef, setPanelRef } =
    useDropdown({ placement: "bottom-start", offset: 6 });

  let taRef!: HTMLTextAreaElement;

  const filtered = () => {
    const q = connQuery().toLowerCase().trim();
    const all = connections() ?? [];
    return q ? all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.nick ?? "").toLowerCase().includes(q)
    ) : all;
  };

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

  function toggleAllow(c: AclEntry) {
    const key = entryKey(c);
    setAllowKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleModeClick(m: AclMode) {
    setAclMode(m);
    if (m === "custom") {
      setFetchEnabled(true);
      toggleAcl();
    } else {
      setAclOpen(false);
    }
  }

  async function handleSubmit() {
    if (!body().trim()) return;
    setSubmitting(true);
    setError("");

    const fd = new FormData();
    fd.append("body", body());
    fd.append("mimetype", "text/bbcode");
    fd.append("obj_type", "Note");
    fd.append("profile_uid", String(auth()!.uid));
    fd.append("type", "wall");
    fd.append("return", "");

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
      // custom
      if (allowKeys().size === 0) {
        setError("Select at least one connection to allow.");
        setSubmitting(false);
        return;
      }
      for (const key of allowKeys()) {
        const [type, ...rest] = key.split(":");
        const xid = rest.join(":");
        if (type === "c") fd.append("contact_allow[]", xid);
        if (type === "g") fd.append("group_allow[]", xid);
      }
      fd.append("contact_deny", "");
      fd.append("group_deny", "");
    }

    try {
      const res = await fetch("/item", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => ({})) as { success?: number; cancel?: number };
      if (json.cancel) { setError("Cancelled by server."); return; }
      if (!json.success) { setError("Server reported failure."); return; }
      resetComposer();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetComposer() {
    setBody("");
    setAllowKeys(new Set<string>());
    setAclMode("connections");
    setError("");
    if (taRef) taRef.style.height = "auto";
    storageDel(DRAFT_KEY);
  }

  const modeLabel: Record<AclMode, string> = {
    public: "🌐 Public",
    connections: "🔒 Connections",
    custom: "🤫 Custom",
  };

  const toolbar = [
    { title: "Bold",     label: "B",  cls: "font-bold", action: () => wrapBb("[b]", "[/b]") },
    { title: "Italic",   label: "I",  cls: "italic",    action: () => wrapBb("[i]", "[/i]") },
    { title: "Link",     label: "🔗", cls: "",          action: () => {
      const url = window.prompt("URL:", "https://");
      if (url) wrapBb(`[url=${url}]`, "[/url]", "Link text");
    }},
    { title: "Mention",  label: "@",  cls: "",          action: () => wrapBb("@", "", "nick@domain") },
    { title: "Hashtag",  label: "#",  cls: "",          action: () => wrapBb("#", "", "tag") },
  ];

  return (
    <div class="bg-surface border border-rim rounded-2xl p-3 shadow-sm flex flex-col">

      {/* Body area — grows to fill card height */}
      <div class="flex gap-2.5 flex-1 min-h-[120px]">
        <Show when={auth()?.nick}>
          <div class="w-8 h-8 rounded-full bg-accent-muted text-accent flex items-center
                      justify-center text-sm font-bold shrink-0 mt-0.5 select-none">
            {auth()!.nick[0].toUpperCase()}
          </div>
        </Show>
        <textarea
          ref={taRef!}
          placeholder="What's on your mind?"
          value={body()}
          onInput={(e) => { setBody(e.currentTarget.value); autoResize(); }}
          rows={4}
          class="flex-1 resize-none bg-transparent text-sm text-txt placeholder:text-muted
                 focus:outline-none leading-relaxed overflow-hidden w-full"
        />
      </div>

      {/* Toolbar row */}
      <div class="flex items-center gap-0.5 mt-2 pt-2 border-t border-rim">
        <For each={toolbar}>
          {(btn) => (
            <button
              type="button"
              title={btn.title}
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
            title="Clear composer"
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
          title="Open full composer"
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
      <div class="flex items-center gap-1 mt-2 flex-wrap">
        <div ref={setTriggerRef} class="flex items-center gap-1">
          <For each={["public", "connections", "custom"] as AclMode[]}>
            {(m) => (
              <button
                type="button"
                onClick={() => handleModeClick(m)}
                class={`px-2 py-0.5 rounded-md text-xs border transition-all
                        ${aclMode() === m
                          ? "border-accent text-accent bg-accent/10"
                          : "border-rim text-muted hover:border-elevated hover:text-txt"}`}
              >
                {modeLabel[m]}
              </button>
            )}
          </For>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting() || !body().trim()}
          class="ml-auto px-4 py-1 rounded-lg text-xs font-semibold bg-accent text-accent-txt
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {submitting() ? "Posting…" : "Post"}
        </button>
      </div>

      {/* Error */}
      <Show when={error()}>
        <p class="mt-1.5 text-xs text-red-500">{error()}</p>
      </Show>

      {/* Custom ACL dropdown */}
      <Show when={aclOpen() && aclMode() === "custom"}>
        <Portal>
          <div
            ref={(el) => setPanelRef(el)}
            use:motion={{
              initial: { opacity: 0, scale: 0.97, y: -4 },
              animate: { opacity: 1, scale: 1, y: 0 },
              transition: { duration: 0.12 },
            }}
            style={floatStyle()}
            class="z-50 w-72 rounded-xl border border-rim bg-surface shadow-xl
                   overflow-hidden flex flex-col max-h-72"
          >
            {/* Search */}
            <div class="px-3 py-2 border-b border-rim shrink-0">
              <input
                type="text"
                placeholder="Search connections…"
                value={connQuery()}
                onInput={(e) => setConnQuery(e.currentTarget.value)}
                class="w-full px-2.5 py-1.5 text-xs rounded-lg border border-rim bg-elevated
                       text-txt placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Selected chips */}
            <Show when={allowKeys().size > 0}>
              <div class="flex flex-wrap gap-1 px-3 py-1.5 border-b border-rim shrink-0 max-h-20 overflow-y-auto">
                <For each={[...allowKeys()]}>
                  {(key) => {
                    const conn = (connections() ?? []).find(c => entryKey(c) === key);
                    return (
                      <span class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                                   bg-accent/10 border border-accent/40 text-accent">
                        {conn?.name ?? key.slice(0, 14) + "…"}
                        <button type="button"
                          onClick={() => conn && toggleAllow(conn)}
                          class="hover:opacity-70 leading-none">
                          ✕
                        </button>
                      </span>
                    );
                  }}
                </For>
              </div>
            </Show>

            {/* List */}
            <ul class="overflow-y-auto flex-1 py-1">
              <Show when={connections.loading}>
                <li class="px-4 py-3 text-xs text-muted text-center">Loading…</li>
              </Show>
              <For each={filtered()}>
                {(c) => {
                  const key = entryKey(c);
                  const allowed = () => allowKeys().has(key);
                  return (
                    <li>
                      <button
                        type="button"
                        onClick={() => toggleAllow(c)}
                        class={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs
                                transition-colors ${allowed()
                                  ? "bg-accent/10 text-accent"
                                  : "text-muted hover:bg-elevated hover:text-txt"}`}
                      >
                        <Show when={c.photo} fallback={
                          <span class="w-5 h-5 rounded-full bg-elevated flex items-center
                                       justify-center text-[10px] shrink-0">
                            {c.type === "g" ? "g" : "?"}
                          </span>
                        }>
                          <img src={c.photo} alt="" class="w-5 h-5 rounded-full shrink-0 object-cover" />
                        </Show>
                        <span class="truncate flex-1">
                          {c.type === "g" ? "👥 " : ""}{c.name}
                        </span>
                        <Show when={allowed()}>
                          <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                          </svg>
                        </Show>
                      </button>
                    </li>
                  );
                }}
              </For>
            </ul>
          </div>
        </Portal>
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
