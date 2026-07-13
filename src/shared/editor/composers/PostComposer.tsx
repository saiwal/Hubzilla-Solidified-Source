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
  type Component,
} from "solid-js";
import { DraftsList } from "../components/DraftsList";
import { Portal } from "solid-js/web";
import { MdOutlineTimer, MdOutlineSchedule } from "solid-icons/md";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import AclPicker from "../components/AclPicker";
import DateTimePicker from "../components/DateTimePicker";
import type { AclMode } from "../components/AclPicker";
import type { AclEntry } from "@/modules/network/api";
import { useAclState } from "../components/useAclState";
import { useCategoryTags } from "../components/useCategoryTags";
import CategoryTagsField from "../components/CategoryTagsField";
import { usePollState } from "../poll/usePollState";
import PollToggleButton from "../poll/PollToggleButton";
import PollPanel from "../poll/PollPanel";
import { useMentionEmojiWiring } from "../mention/useMentionEmojiWiring";
import MentionEmojiPopups from "../mention/MentionEmojiPopups";
import SummaryField from "../components/SummaryField";
import { PrimarySubmitButton, SecondaryButton, ToggleButton, IconButton } from "../components/buttons";
import { helpable } from "@/shared/lib/helpable";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { currentNick, isFeatureEnabled } from "@/shared/store/auth-store";
import { bbcodeToInsert, patchInsertedAlt } from "../attachments/insertHelpers";
import type { FileAcl } from "@/modules/files/api";
import { useI18n } from "@/i18n";
import { toast } from "@/shared/store/toast";
import { getCsrfToken } from "@/shared/lib/csrf";
import { isEncryptedBody } from "@/shared/lib/postCrypto";
import { useEncrypt } from "../useEncrypt";
import EncryptPanel from "../components/EncryptPanel";
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
  /** Entries the caller already knows about (e.g. a DM recipient) so their
   *  allow/deny chip resolves to a name/photo immediately. */
  initialResolvedEntries?: AclEntry[];
  parentId?: number;
  /** Hide the ACL picker and lock scope to "connections" (channel owner's default).
   *  Use when the poster is a visitor — they don't control the wall's privacy. */
  hideAcl?: boolean;
  /** Override the draft/attachment scope key (default "post:new" /
   *  "post:reply:<parentId>"). Pass a distinct key for special flows like
   *  reshares so their autosave never clobbers the regular composer draft. */
  scopeKey?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const PostComposer: Component<ComposerProps> = (props) => {
  const { t } = useI18n();
  const caps = CAPABILITIES.post;

  // ── Scope (shared by both stores for matching IDB keys) ───────────────────
  const scope =
    props.scopeKey ??
    (props.parentId ? `post:reply:${props.parentId}` : "post:new");

  // ── Attachment store ───────────────────────────────────────────────────────
  const attach = createAttachmentStore(currentNick(), scope);

  // ── ACL state ───────────────────────────────────────────────────────────────
  const acl = useAclState({
    mode: props.hideAcl ? "connections" : (props.initialAclMode ?? "connections"),
    allowEntries: props.initialAllowEntries,
  });
  const [expiry, setExpiry] = createSignal("");
  const [fullscreen, setFullscreen] = createSignal(false);
  const [draftsOpen, setDraftsOpen] = createSignal(false);

  // ── Location / delayed publish / comment lock ─────────────────────────────
  const [locationOpen, setLocationOpen] = createSignal(false);
  const [location, setLocation] = createSignal("");
  const [coord, setCoord] = createSignal("");
  const [locating, setLocating] = createSignal(false);
  const [publishAt, setPublishAt] = createSignal("");
  const [noComment, setNoComment] = createSignal(false);

  function geotag() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Core stores browser coordinates as "lat lon" (jot_geotag.tpl)
        setCoord(`${pos.coords.latitude} ${pos.coords.longitude}`);
        setLocating(false);
      },
      () => setLocating(false),
    );
  }

  // ── Poll state ─────────────────────────────────────────────────────────────
  const poll = usePollState();

  // ── Sync ACL to attachment store ───────────────────────────────────────────
  createEffect(() => {
    const mode = acl.mode();
    if (mode === "connections") {
      attach.setAcl(null); // leave files at channel defaults
      return;
    }
    const fileAcl: FileAcl = { allow_cid: [], allow_gid: [], deny_cid: [], deny_gid: [] };
    if (mode === "custom") {
      for (const key of acl.allowEntries()) {
        const [type, ...rest] = key.split(":");
        const xid = rest.join(":");
        if (type === "c") fileAcl.allow_cid.push(xid);
        if (type === "g") fileAcl.allow_gid.push(xid);
      }
      for (const key of acl.denyEntries()) {
        const [type, ...rest] = key.split(":");
        const xid = rest.join(":");
        if (type === "c") fileAcl.deny_cid.push(xid);
        if (type === "g") fileAcl.deny_gid.push(xid);
      }
    }
    // mode === "public": all arrays stay empty (public)
    attach.setAcl(fileAcl);
  });

  // ── Composer store ─────────────────────────────────────────────────────────

  const store = createComposerStore(
    async (body, meta) => {
      // ── Append [attachment] BBCode tags for all attached files/photos ────────
      // Item.php strips these tags from the body and stores them in item.attach.
      // Photos use resource_id (= hash in the attach table) as the identifier.
      // inline via [img] when the user clicks Insert; files always auto-append.
      const fileTags = attach.attachments()
        .filter((a) => a.status === "ready" && !a.isImage && (a.hash || a.resourceId))
        .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
        .join("\n");
      const augmentedBody = fileTags ? `${body}\n${fileTags}` : body;

      const csrf = await getCsrfToken();

      // ── Build ACL scope ──
      const mode = acl.mode();
      const payload: Record<string, unknown> = {
        body: augmentedBody,
        mimetype: meta.mimetype ?? "text/bbcode",
        profile_uid: props.profileUid,
      };
      if (meta.title) payload.title = meta.title;
      if (meta.summary) payload.summary = meta.summary;
      if (meta.category) payload.category = meta.category;
      if (expiry()) payload.expire = expiry();
      if (location().trim()) payload.location = location().trim();
      if (coord()) payload.coord = coord();
      if (publishAt()) {
        payload.created = publishAt();
        payload.delayed = 1;
      }
      if (noComment()) payload.nocomment = 1;

      if (mode === "public") {
        payload.scope = "public";
      } else if (mode === "connections") {
        payload.scope = "contacts";
      } else {
        // Custom — require at least one allow entry
        if (acl.allowEntries().size === 0) {
          throw new Error("Select at least one connection or group to allow.");
        }
        payload.scope = "custom";
        const contactAllow: string[] = [];
        const groupAllow: string[] = [];
        const contactDeny: string[] = [];
        const groupDeny: string[] = [];
        for (const key of acl.allowEntries()) {
          const [type, ...rest] = key.split(":");
          const xid = rest.join(":");
          if (type === "c") contactAllow.push(xid);
          if (type === "g") groupAllow.push(xid);
        }
        for (const key of acl.denyEntries()) {
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
      const pollPayload = poll.toFormPayload();
      if (pollPayload) {
        payload.poll_answers = pollPayload.answers;
        payload.poll_expire_value = pollPayload.expireValue;
        payload.poll_expire_unit = pollPayload.expireUnit;
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
        data?: { post?: { iid?: number } };
      };
      if (!json.data?.post) {
        throw new Error("Server reported failure. Check Hubzilla logs.");
      }

      toast.success(publishAt() ? t("editor.post_scheduled") : t("editor.post_published"));
      props.onPosted?.(json.data.post.iid ?? 0);
      attach.clear();
      props.onClose();
    },
    scope,
    { initialBody: props.initialBody },
  );

  // ── Encrypt ─────────────────────────────────────────────────────────────────
  const enc = useEncrypt(() => store.body(), store.setBody);

  // ── Category tags ──────────────────────────────────────────────────────────
  const categoryTags = useCategoryTags(store.category, store.setCategory);

  // ── Reset ──────────────────────────────────────────────────────────────────
  function resetAll() {
    store.reset();
    attach.clear();
    acl.reset();
    setExpiry("");
    setLocationOpen(false);
    setLocation("");
    setCoord("");
    setPublishAt("");
    setNoComment(false);
    poll.reset();
    categoryTags.setPendingCategory("");
    enc.reset();
  }

  // ── Mention + emoji autocomplete ──────────────────────────────────────────
  const wiring = useMentionEmojiWiring({
    body: store.body,
    setBody: store.setBody,
    mimetype: store.mimetype,
  });

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  function onKey(e: KeyboardEvent) {
    if (wiring.onKeyDown(e)) return;
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
                <IconButton
                  title={fullscreen() ? t("editor.fullscreen_exit") : t("editor.fullscreen_enter")}
                  onClick={() => setFullscreen((f) => !f)}
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
                </IconButton>
                <IconButton title={t("editor.close_esc")} onClick={props.onClose}>
                  <svg
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </IconButton>
              </div>
            </header>

            {/* ── Meta fields (title) ── */}
            <Show when={caps.title}>
              <div class="flex gap-2 px-4 pt-3 pb-2 border-b border-rim shrink-0">
                <input
                  type="text"
                  placeholder={t("editor.title_placeholder")}
                  value={store.title()}
                  onInput={(e) => store.setTitle(e.currentTarget.value)}
                  class="flex-1 min-w-0 bg-transparent text-sm font-medium text-txt
                         placeholder:text-muted outline-none"
                />
              </div>
            </Show>

            {/* ── Summary ── */}
            <Show when={caps.summary && !props.parentId}>
              <div class="px-4 py-2 border-b border-rim shrink-0">
                <SummaryField
                  value={store.summary}
                  onInput={store.setSummary}
                  placeholder={t("editor.post_summary_placeholder")}
                  class="w-full bg-transparent text-sm text-txt placeholder:text-muted outline-none resize-none"
                />
              </div>
            </Show>

            {/* ── Category ── */}
            <Show when={caps.category && !props.parentId}>
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
                placeholder={t("editor.category_placeholder")}
              />
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
            <div ref={wiring.wrapperRef} class="flex-1 overflow-hidden min-h-0 flex flex-col">
              <RichEditor
                body={store.body()}
                onInput={store.setBody}
                capabilities={caps}
                tab={store.tab()}
                onTabChange={store.setTab}
                mimetype={store.mimetype()}
                onCtrlEnter={() => { if (!wiring.mention.open()) void store.submit(); }}
                onPasteFiles={(files) => attach.addUploads(files)}
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
                onAltChange={(att) => {
                  store.setBody(patchInsertedAlt(store.body(), att, store.mimetype()));
                }}
              />
            </div>

            {/* ── Location panel ── */}
            <Show when={locationOpen()}>
              <div class="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-rim bg-elevated/40 shrink-0">
                <input
                  type="text"
                  value={location()}
                  placeholder={t("editor.location_placeholder")}
                  onInput={(e) => setLocation(e.currentTarget.value)}
                  class="flex-1 min-w-40 bg-transparent border border-rim rounded px-2.5 py-1 text-sm
                         text-txt placeholder:text-muted outline-none focus:border-rim-strong transition-colors"
                />
                <Show
                  when={!coord()}
                  fallback={
                    <button
                      type="button"
                      onClick={() => setCoord("")}
                      title={t("editor.location_clear_coord")}
                      class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border bg-accent/10 text-accent border-accent/30 hover:opacity-80 transition-opacity"
                    >
                      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {coord().split(" ").map((c) => Number(c).toFixed(3)).join(", ")}
                    </button>
                  }
                >
                  <button
                    type="button"
                    onClick={geotag}
                    disabled={locating()}
                    title={t("editor.location_use_browser")}
                    class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border border-rim text-muted
                           hover:text-txt hover:bg-elevated transition-colors disabled:opacity-40"
                  >
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="3" stroke-width="2" />
                      <path stroke-linecap="round" stroke-width="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
                    </svg>
                    {locating() ? t("editor.location_locating") : t("editor.location_use_browser")}
                  </button>
                </Show>
              </div>
            </Show>

            {/* ── Poll panel ── */}
            <Show when={caps.poll && poll.enabled()}>
              <PollPanel poll={poll} />
            </Show>

            {/* ── Encrypt panel ── */}
            <Show when={enc.open()}>
              <EncryptPanel enc={enc} />
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
                  mode={acl.mode()}
                  onModeChange={acl.setMode}
                  allowEntries={acl.allowEntries()}
                  denyEntries={acl.denyEntries()}
                  onToggle={acl.toggleEntry}
                  onClear={acl.clearEntries}
                  seedEntries={props.initialResolvedEntries}
                />
              </Show>

              {/* Expiry — gated behind Settings → Features → Content Expiration */}
              <Show when={isFeatureEnabled("content_expire") && !props.parentId}>
                <div class="hidden sm:block">
                  <DateTimePicker
                    value={expiry()}
                    onChange={setExpiry}
                    min={() => new Date()}
                    icon={<MdOutlineTimer size={14} />}
                    title={t("editor.expire_at")}
                    placeholder={t("editor.expire_at")}
                  />
                </div>
              </Show>

              {/* Location toggle */}
              <ToggleButton
                active={locationOpen() || !!location().trim() || !!coord()}
                onClick={() => setLocationOpen((o) => !o)}
                title={t("editor.location_toggle")}
              >
                <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <circle cx="12" cy="11" r="3" stroke-width="2" />
                </svg>
                {t("editor.location_toggle")}
              </ToggleButton>

              {/* Delayed publish — gated behind Settings → Features → Delayed Posting */}
              <Show when={isFeatureEnabled("delayed_posting") && !props.parentId}>
                <div class="hidden sm:block">
                  <DateTimePicker
                    value={publishAt()}
                    onChange={setPublishAt}
                    min={() => new Date()}
                    icon={<MdOutlineSchedule size={14} />}
                    title={t("editor.publish_at")}
                    placeholder={t("editor.publish_at")}
                  />
                </div>
              </Show>

              {/* Disable comments — gated behind Settings → Features → Disable Comments */}
              <Show when={isFeatureEnabled("disable_comments") && !props.parentId}>
                <ToggleButton
                  active={noComment()}
                  onClick={() => setNoComment((v) => !v)}
                  title={t("editor.nocomment_toggle")}
                >
                  <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 12h8m-4-9a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                  {t("editor.nocomment_toggle")}
                </ToggleButton>
              </Show>

              {/* Poll toggle */}
              <Show when={caps.poll && !props.parentId}>
                <PollToggleButton
                  active={poll.enabled()}
                  onToggle={() => poll.setEnabled((p) => !p)}
                />
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
                  <SecondaryButton onClick={() => void store.saveAsDraft()}>
                    <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3v5H9V3m0 14h6" />
                    </svg>
                    {t("editor.save_draft")}
                  </SecondaryButton>
                  <IconButton title={t("editor.clear_composer")} onClick={resetAll} variant="danger">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </IconButton>
                </Show>
                <PrimarySubmitButton
                  disabled={store.submitting() || attach.uploading()}
                  onClick={() => void store.submit()}
                >
                  {store.submitting() ? t("editor.posting") : t("editor.post_btn")}
                </PrimarySubmitButton>
              </div>
            </footer>

          </div>
        </div>

        <MentionEmojiPopups wiring={wiring} />
      </Portal>
    </Show>
  );
};

export default PostComposer;
