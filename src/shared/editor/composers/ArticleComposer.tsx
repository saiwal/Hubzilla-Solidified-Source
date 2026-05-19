import { createSignal, Show } from "solid-js";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import EditorPreview from "../core/EditorPreview";
import { CAPABILITIES } from "../types/editor.types";
import { apiFetch } from "@/shared/lib/fetch";
import AclPicker, { entryKey, type AclMode, type AclEntry } from "../components/AclPicker";

interface Props {
  profileUid: number;
  nick: string;
  /** Pass existing article data to edit rather than create */
  initial?: {
    mid: string;      // required for edit — passed to /api/item/:mid/edit
    title: string;
    summary: string;
    slug: string;
    category: string;
    body: string;
  };
  onSaved?: () => void;
}

export default function ArticleComposer(props: Props) {
  const caps = CAPABILITIES.article;
  const [showPreview, setShowPreview] = createSignal(false);
  const [wordCount, setWordCount] = createSignal(0);
  const isEditing = () => !!props.initial?.mid;

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

  // ── Scope + store ────────────────────────────────────────────────────────────
  const scope = props.initial?.mid
    ? `article:edit:${props.initial.mid}`
    : "article:new";

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
        `/api/item/${encodeURIComponent(props.initial!.mid)}/edit`,
        {
          method: "POST",
          body: JSON.stringify({
            body,
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
      fd.append("body",        body);
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

  const onBodyChange = (v: string) => {
    store.setBody(v);
    const text = v.replace(/<[^>]*>/g, " ");
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
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
        placeholder="Article title…"
        value={store.title()}
        onInput={(e) => onTitleChange(e.currentTarget.value)}
        class="w-full px-0 py-2 text-2xl font-bold bg-transparent text-txt
               placeholder:text-muted border-0 border-b border-rim outline-none
               focus:border-accent transition-colors"
      />

      {/* Summary */}
      <Show when={caps.summary}>
        <textarea
          placeholder="Short summary (shown in article listings)…"
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
            <label class="block text-xs text-muted mb-1">Slug</label>
            <input
              type="text"
              placeholder="url-slug"
              value={store.slug()}
              onInput={(e) => store.setSlug(e.currentTarget.value)}
              class="w-full px-2 py-1.5 text-sm font-mono rounded border border-rim bg-surface
                     text-txt outline-none hover:border-rim-strong focus:border-rim-strong transition-colors"
            />
          </div>
        </Show>
        <Show when={caps.category}>
          <div class="flex-1 min-w-0">
            <label class="block text-xs text-muted mb-1">Category</label>
            <input
              type="text"
              placeholder="e.g. tech, personal"
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
        <label class="text-xs text-muted">Format</label>
        <select
          value={store.mimetype()}
          onChange={(e) =>
            store.setMimetype(
              e.currentTarget.value as "text/bbcode" | "text/html",
            )
          }
          class="text-xs px-2 py-1 rounded border border-rim bg-surface text-txt"
        >
          <option value="text/bbcode">BBCode</option>
          <option value="text/html">HTML</option>
        </select>
        <span class="text-xs text-muted ml-auto">{wordCount()} words</span>
      </div>

      {/* Editor */}
      <RichEditor
        body={store.body()}
        onInput={onBodyChange}
        capabilities={caps}
        tab={store.tab()}
        onTabChange={store.setTab}
        placeholder="Start writing…"
        minHeight="400px"
      />

      {/* Preview */}
      <Show when={showPreview() && store.body().trim()}>
        <EditorPreview body={store.body()} mimetype={store.mimetype()} />
      </Show>

      {/* Error */}
      <Show when={store.error()}>
        <p class="text-sm text-red-500 bg-red-50/10 px-3 py-2 rounded-lg">
          {store.error()}
        </p>
      </Show>

      {/* Actions */}
      <div class="flex flex-wrap items-center gap-3 border-t border-rim pt-4">
        {/* Left: preview / discard */}
        <div class="flex gap-2">
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                   hover:bg-elevated transition-colors"
          >
            {showPreview() ? "Hide preview" : "Preview"}
          </button>
          <button
            type="button"
            onClick={() => { store.reset(); clearEntries(); setAclMode("connections"); }}
            class="px-3 py-1.5 text-sm rounded-lg border border-rim text-muted
                   hover:bg-elevated transition-colors"
          >
            {isEditing() ? "Cancel" : "Discard"}
          </button>
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
            !store.body().trim() ||
            !store.title().trim()
          }
          class="ml-auto px-5 py-1.5 text-sm font-medium rounded-lg bg-accent text-accent-txt
                 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {store.submitting()
            ? "Saving…"
            : isEditing()
              ? "Save changes"
              : "Publish"}
        </button>
      </div>
    </div>
  );
}
