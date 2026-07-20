import { createSignal, Show, onCleanup } from "solid-js";
import { DraftsList } from "../components/DraftsList";
import { createComposerStore } from "../store/createComposerStore";
import { useI18n } from "@/i18n";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { apiFetch } from "@/shared/lib/fetch";
import AclPicker from "../components/AclPicker";
import { useEncrypt } from "../useEncrypt";
import EncryptPanel from "../components/EncryptPanel";
import { isEncryptedBody } from "@/shared/lib/postCrypto";
import { isFeatureEnabled } from "@/shared/store/auth-store";
import { useMentionEmojiWiring } from "../mention/useMentionEmojiWiring";
import MentionEmojiPopups from "../mention/MentionEmojiPopups";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { bbcodeToInsert } from "../attachments/insertHelpers";
import { useAclState } from "../components/useAclState";
import type { AclMode } from "../components/AclPicker";
import { useCategoryTags } from "../components/useCategoryTags";
import CategoryTagsField from "../components/CategoryTagsField";
import SlugField from "../components/SlugField";
import SummaryField from "../components/SummaryField";
import { PrimarySubmitButton, SecondaryButton, ToggleButton } from "../components/buttons";
import { slugify } from "../lib/slugify";

interface Props {
  profileUid: number;
  nick: string;
  /** Pass existing article data to edit rather than create */
  initial?: {
    uuid: string;
    iid?: number;
    title: string;
    summary: string;
    slug: string;
    category: string;
    body: string;
    public_policy?: string;
    allow_cid?: string[];
    allow_gid?: string[];
    deny_cid?: string[];
    deny_gid?: string[];
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

  // ── ACL state — initialize from the existing article's ACL when editing ─────
  const initialAclMode = (): AclMode => {
    const p = props.initial;
    if (!p) return "connections";
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
  const acl = useAclState({
    mode: initialAclMode(),
    allowEntries: initialAllowEntries(),
    denyEntries: initialDenyEntries(),
  });

  // ── Composer store ────────────────────────────────────────────────────────────
  // Append [attachment]hash,0[/attachment] BBCode for non-image files.
  // Item.php scans the body for these tags and builds native Hubzilla attachments.
  function withFileAttachments(body: string): string {
    const tags = attach.attachments()
      .filter((a) => a.status === "ready" && !a.isImage && (a.hash || a.resourceId))
      .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
      .join("\n");
    return tags ? `${body}\n${tags}` : body;
  }

  // Raw contact_allow/group_allow/contact_deny/group_deny arrays + public_policy,
  // matching what Articles.php::resolveAcl() expects.
  function aclPayload(): Record<string, unknown> {
    const mode = acl.mode();
    if (mode === "public") {
      return { contact_allow: [], group_allow: [], contact_deny: [], group_deny: [], public_policy: "" };
    }
    if (mode === "connections") {
      return { contact_allow: [], group_allow: [], contact_deny: [], group_deny: [], public_policy: "contacts" };
    }
    if (acl.allowEntries().size === 0)
      throw new Error("Select at least one connection or group to allow.");
    const cAllow: string[] = [];
    const gAllow: string[] = [];
    const cDeny: string[]  = [];
    const gDeny: string[]  = [];
    for (const key of acl.allowEntries()) {
      const [type, ...rest] = key.split(":");
      if (type === "c") cAllow.push(rest.join(":"));
      if (type === "g") gAllow.push(rest.join(":"));
    }
    for (const key of acl.denyEntries()) {
      const [type, ...rest] = key.split(":");
      if (type === "c") cDeny.push(rest.join(":"));
      if (type === "g") gDeny.push(rest.join(":"));
    }
    return { contact_allow: cAllow, group_allow: gAllow, contact_deny: cDeny, group_deny: gDeny, public_policy: "" };
  }

  const store = createComposerStore(async (body, meta) => {
    const res = await apiFetch(`/spa/articles/${props.nick}`, {
      method: "POST",
      body: JSON.stringify({
        post_id:  isEditing() ? props.initial!.iid : undefined,
        body:     withFileAttachments(body),
        title:    meta.title    ?? "",
        summary:  meta.summary  ?? "",
        slug:     meta.slug     ?? "",
        category: meta.category ?? "",
        mimetype: meta.mimetype ?? "text/bbcode",
        ...aclPayload(),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error?.message ?? err?.error ?? "Save failed");
    }

    attach.clear();
    props.onSaved?.();
  }, scope);

  const enc = useEncrypt(() => store.body(), store.setBody);

  // ── Category tags ──────────────────────────────────────────────────────────
  const categoryTags = useCategoryTags(store.category, store.setCategory);

  // Seed from initial if editing
  if (props.initial) {
    store.setTitle(props.initial.title);
    store.setSummary(props.initial.summary);
    store.setSlug(props.initial.slug);
    store.setCategory(props.initial.category);
    store.setBody(props.initial.body);
  }

  // ── Mention + emoji autocomplete ─────────────────────────────────────────────
  const wiring = useMentionEmojiWiring({
    body: store.body,
    setBody: store.setBody,
    mimetype: store.mimetype,
  });

  window.addEventListener("keydown", wiring.onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", wiring.onKeyDown));

  const onBodyChange = (v: string) => {
    store.setBody(v);
    const text = v.replace(/<[^>]*>/g, " ");
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
  };

  const onTitleChange = (v: string) => {
    store.setTitle(v);
    if (!store.slug()) {
      store.setSlug(slugify(v));
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
        <SummaryField
          value={store.summary}
          onInput={store.setSummary}
          placeholder={t("editor.article_summary_placeholder")}
          class="w-full px-0 py-1.5 text-sm bg-transparent text-txt
                 placeholder:text-muted border-0 border-b border-rim outline-none
                 focus:border-accent transition-colors resize-none"
        />
      </Show>

      {/* Slug + Category row */}
      <div class="flex gap-3">
        <Show when={caps.slug}>
          <SlugField value={store.slug} onInput={store.setSlug} title={store.title} />
        </Show>
        <Show when={caps.category}>
          <CategoryTagsField
            tags={categoryTags.categoryTags}
            pending={categoryTags.pendingCategory}
            onPendingInput={categoryTags.setPendingCategory}
            onKeyDown={categoryTags.onCategoryKeyDown}
            onRemove={categoryTags.removeCategoryTag}
            onBlur={() => {
              if (categoryTags.pendingCategory().trim()) {
                categoryTags.addCategoryTag(categoryTags.pendingCategory());
              }
            }}
            placeholder={t("editor.category_field_placeholder")}
            showLabel
            label={t("editor.category_label")}
          />
        </Show>
      </div>

      <div class="flex items-center justify-end">
        <span class="text-xs text-muted">{t("editor.words_count", { count: wordCount() })}</span>
      </div>

      {/* Editor */}
      <div ref={wiring.wrapperRef}>
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

      {/* Encrypt panel */}
      <Show when={enc.open()}>
        <EncryptPanel enc={enc} />
      </Show>

      <MentionEmojiPopups wiring={wiring} />

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
          <SecondaryButton
            onClick={() => {
              store.reset();
              attach.clear();
              acl.reset();
              categoryTags.setPendingCategory("");
              enc.reset();
            }}
          >
            {isEditing() ? t("editor.cancel_btn") : t("editor.discard")}
          </SecondaryButton>
          <Show when={store.body().trim()}>
            <SecondaryButton onClick={() => void store.saveAsDraft()}>
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3v5H9V3m0 14h6" />
              </svg>
              {t("editor.save_draft")}
            </SecondaryButton>
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
            mode={acl.mode()}
            onModeChange={acl.setMode}
            allowEntries={acl.allowEntries()}
            denyEntries={acl.denyEntries()}
            onToggle={acl.toggleEntry}
            onClear={acl.clearEntries}
          />
        </Show>

        {/* Encrypt toggle */}
        <Show when={isFeatureEnabled("content_encrypt")}>
          <Show
            when={!isEncryptedBody(store.body())}
            fallback={
              <span class="flex items-center gap-1 px-2 py-1 rounded-md text-xs border bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                🔒 {t("editor.encrypt_badge")}
              </span>
            }
          >
            <ToggleButton
              active={enc.open()}
              onClick={() => enc.setOpen((o) => !o)}
              title={t("editor.encrypt_toggle")}
            >
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              {t("editor.encrypt_toggle")}
            </ToggleButton>
          </Show>
        </Show>

        {/* Right: publish */}
        <div class="ml-auto">
          <PrimarySubmitButton
            disabled={
              store.submitting() ||
              attach.uploading() ||
              !store.body().trim() ||
              !store.title().trim()
            }
            onClick={() => void store.submit()}
          >
            {store.submitting()
              ? t("editor.saving")
              : isEditing()
                ? t("editor.save_changes")
                : t("editor.publish_btn")}
          </PrimarySubmitButton>
        </div>
      </div>
    </div>
  );
}
