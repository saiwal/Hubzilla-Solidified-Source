import { Show, onCleanup, createSignal, createEffect, For } from "solid-js";
import { useI18n } from "@/i18n";
import { useTemplates, loadTemplates, createTemplate } from "@/shared/store/widget-templates";
import { queryClient } from "@/shared/lib/query-client";
import TemplateNameForm from "@/shared/views/TemplateNameForm";
import { setCurrentPageTemplateId } from "@/modules/webpages/store";
import { editingWidgets, setEditingWidgets } from "@/shared/store/widget-layout";
import { MdFillAdd, MdOutlineEdit, MdFillCheck } from "solid-icons/md";
import { createComposerStore } from "../store/createComposerStore";
import RichEditor from "../core/RichEditor";
import { CAPABILITIES } from "../types/editor.types";
import { getCsrfToken } from "@/shared/lib/csrf";
import { useEncrypt } from "../useEncrypt";
import EncryptPanel from "../components/EncryptPanel";
import { isEncryptedBody } from "@/shared/lib/postCrypto";
import { isFeatureEnabled } from "@/shared/store/auth-store";
import AttachmentBar from "../attachments/AttachmentBar";
import { createAttachmentStore } from "../attachments/useAttachments";
import { bbcodeToInsert } from "../attachments/insertHelpers";
import AclPicker, { type AclMode } from "../components/AclPicker";
import { useAclState, splitAclEntries } from "../components/useAclState";
import { useMentionEmojiWiring } from "../mention/useMentionEmojiWiring";
import MentionEmojiPopups from "../mention/MentionEmojiPopups";
import SlugField from "../components/SlugField";
import SummaryField from "../components/SummaryField";
import { PrimarySubmitButton, SecondaryButton, ToggleButton } from "../components/buttons";
import { slugify } from "../lib/slugify";

interface Props {
  profileUid: number;
  nick: string;
  initial?: {
    uuid: string;
    mid: string;
    title: string;
    summary: string;
    slug: string;
    body: string;
    mimetype: string;
    item_private?: number;
    public_policy?: string;
    allow_cid?: string[];
    allow_gid?: string[];
    deny_cid?: string[];
    deny_gid?: string[];
    layout_template?: string | null;
  };
  onSaved?: () => void;
  onCancel?: () => void;
}

export default function WebpageComposer(props: Props) {
  const { t } = useI18n();
  const caps = CAPABILITIES.webpage;
  const isEditing = () => !!props.initial?.uuid;
  const scope = props.initial?.uuid
    ? `webpage:edit:${props.initial.uuid}`
    : "webpage:new";

  const attach = createAttachmentStore(props.nick, scope);

  // ── ACL state — initialize from existing page data when editing ──────────────
  const initialAclMode = (): AclMode => {
    const p = props.initial;
    if (!p) return "public";
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

  // ── Page layout template assignment — pick one, or create a new one inline.
  // While this composer is mounted, it drives the app shell's own
  // currentPageTemplateId (same signal PageView.tsx sets while viewing the
  // live page) — so Layout.tsx's real header/mainTop/right/footer slots
  // immediately reflect whichever template is selected, live, using the
  // exact same rendering AND edit-mode pencil as viewing the actual page.
  // No separate preview UI: the real regions, in their real positions, are
  // the preview, and are directly editable at the same time as the page
  // content — cleared on unmount so navigating away doesn't leak scoping.
  const templates = useTemplates();
  createEffect(() => void loadTemplates());
  const [layoutTemplate, setLayoutTemplate] = createSignal(props.initial?.layout_template ?? "");
  createEffect(() => setCurrentPageTemplateId(layoutTemplate() || null));
  onCleanup(() => setCurrentPageTemplateId(null));
  const templateList = () => Object.entries(templates()?.templates ?? {});
  // A native <select>'s `value` only "sticks" once a matching <option> exists
  // in the DOM, and templateList() can still be empty/stale on first paint.
  // Declaratively binding `value={}` to a derived value doesn't reliably fix
  // this: if the derived output happens to equal what it was last time (e.g.
  // a createMemo whose computed string didn't change), Solid's equality
  // check skips re-running the DOM-setting effect even though the <option>
  // list just changed underneath it — so the select can stay stuck on the
  // first option ("Page default") forever. Set it imperatively instead, in a
  // plain effect (no memoization to skip a "same value" update) that fires
  // on every relevant change and force-syncs the DOM element directly.
  let selectRef: HTMLSelectElement | undefined;
  createEffect(() => {
    templateList(); // track — re-sync once the matching <option> exists
    const val = layoutTemplate();
    if (selectRef && selectRef.value !== val) selectRef.value = val;
  });
  const [creatingTemplate, setCreatingTemplate] = createSignal(false);
  const [justCreatedTemplate, setJustCreatedTemplate] = createSignal(false);

  function aclJson(): Record<string, unknown> {
    const mode = acl.mode();
    if (mode === "public")      return { scope: "public" };
    if (mode === "connections") return { scope: "connections" };

    const { contactIds: allow_cid, groupIds: allow_gid } = splitAclEntries(acl.allowEntries());
    const { contactIds: deny_cid, groupIds: deny_gid } = splitAclEntries(acl.denyEntries());
    return { scope: "custom", allow_cid, allow_gid, deny_cid, deny_gid };
  }

  function withFileAttachments(body: string): string {
    const tags = attach.attachments()
      .filter((a) => a.status === "ready" && !a.isImage && (a.hash || a.resourceId))
      .map((a) => `[attachment]${a.hash ?? a.resourceId},0[/attachment]`)
      .join("\n");
    return tags ? `${body}\n${tags}` : body;
  }

  const store = createComposerStore(async (body, meta) => {
    if (isEditing()) {
      const csrf = await getCsrfToken();
      const res = await fetch("/spa/webpages", {
        method:      "POST",
        headers:     { "X-CSRF-Token": csrf, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action:    "update",
          uuid:      props.initial!.uuid,
          title:     meta.title    ?? "",
          summary:   meta.summary  ?? "",
          body:      withFileAttachments(body),
          mimetype:  meta.mimetype ?? "text/bbcode",
          pagetitle: meta.slug     ?? "",
          layout_template: layoutTemplate() || null,
          ...aclJson(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? err?.error ?? "Save failed");
      }
    } else {
      const csrf = await getCsrfToken();
      const res = await fetch("/spa/webpages", {
        method: "POST",
        headers: { "X-CSRF-Token": csrf, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          action:    "create",
          title:     meta.title    ?? "",
          summary:   meta.summary  ?? "",
          body:      withFileAttachments(body),
          mimetype:  meta.mimetype ?? "text/bbcode",
          pagetitle: meta.slug     ?? "",
          layout_template: layoutTemplate() || null,
          ...aclJson(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Save failed");
      }
    }

    // PageView's createQueryResource("webpage", ...) caches by [nick, pagelink]
    // for 60s (see query-client.ts) — without invalidating, viewing the page
    // right after a save (e.g. after changing its layout_template) can still
    // serve the pre-edit cached response. Partial key match invalidates every
    // cached webpage regardless of pagelink/nick.
    void queryClient.invalidateQueries({ queryKey: ["webpage"] });

    attach.clear();
    props.onSaved?.();
  }, scope, { initialBody: props.initial?.body });

  const enc = useEncrypt(() => store.body(), store.setBody);

  if (props.initial) {
    store.setTitle(props.initial.title);
    store.setSummary(props.initial.summary);
    store.setSlug(props.initial.slug);
    if (props.initial.mimetype) store.setMimetype(props.initial.mimetype as any);
  }

  // ── Mention + emoji autocomplete ─────────────────────────────────────────────
  const wiring = useMentionEmojiWiring({
    body: store.body,
    setBody: store.setBody,
    mimetype: store.mimetype,
  });

  window.addEventListener("keydown", wiring.onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", wiring.onKeyDown));

  const onTitleChange = (v: string) => {
    store.setTitle(v);
    if (!isEditing() && !store.slug()) {
      store.setSlug(slugify(v));
    }
  };

  return (
    <div class="max-w-3xl mx-auto space-y-4 py-6 px-4">
      {/* Title */}
      <input
        type="text"
        placeholder={t("webpages.title_placeholder")}
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

      {/* Slug */}
      <Show when={caps.slug}>
        <SlugField value={store.slug} onInput={store.setSlug} title={store.title} />
      </Show>

      {/* Page layout template assignment — choose, or create a new one inline */}
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
          {t("webpages.layout_template_label")}
          <select
            ref={selectRef}
            onChange={(e) => {
              setLayoutTemplate(e.currentTarget.value);
              setJustCreatedTemplate(false);
            }}
            class="bg-elevated border border-rim rounded-lg px-2 py-1 text-xs text-txt"
          >
            <option value="">{t("webpages.layout_template_default")}</option>
            <For each={templateList()}>
              {([id, tpl]) => <option value={id}>{tpl.name}</option>}
            </For>
          </select>

          <button
            type="button"
            onClick={() => setCreatingTemplate((o) => !o)}
            class="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-rim
                   text-muted hover:text-txt hover:bg-elevated transition-colors"
          >
            <MdFillAdd size={12} />
            {t("webpages.new_template")}
          </button>

          {/* Same pencil/checkmark toggle as Layout.tsx's sidebar header and
              LayoutTemplatesView.tsx's per-row button — one-click access to
              editing this page's real regions without hunting for the
              sidebar pencil separately. */}
          <button
            type="button"
            onClick={() => setEditingWidgets(!editingWidgets())}
            aria-pressed={editingWidgets()}
            class="p-1.5 rounded-md transition-colors"
            classList={{
              "bg-accent text-accent-fg": editingWidgets(),
              "text-muted hover:text-txt hover:bg-elevated": !editingWidgets(),
            }}
            aria-label={editingWidgets() ? t("widgets.done_editing") : t("widgets.edit_layout")}
            title={editingWidgets() ? t("widgets.done_editing") : t("widgets.edit_layout")}
          >
            <Show when={editingWidgets()} fallback={<MdOutlineEdit size={14} />}>
              <MdFillCheck size={14} />
            </Show>
          </button>
        </div>

        <Show when={creatingTemplate()}>
          <TemplateNameForm
            onCancel={() => setCreatingTemplate(false)}
            onSubmit={async (name) => {
              const id = await createTemplate(name);
              setCreatingTemplate(false);
              if (id) {
                setLayoutTemplate(id);
                setJustCreatedTemplate(true);
              }
            }}
          />
        </Show>

        <Show when={justCreatedTemplate()}>
          <p class="text-xs text-muted">{t("webpages.template_created_hint")}</p>
        </Show>
      </div>

      {/* Editor */}
      <div ref={wiring.wrapperRef}>
        <RichEditor
          body={store.body()}
          onInput={store.setBody}
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
          accept="files"
          onInsert={(bbcode) => {
            store.setBody(store.body() + "\n" + bbcodeToInsert(bbcode, store.mimetype()));
          }}
        />
      </div>

      <MentionEmojiPopups wiring={wiring} />

      {/* Encrypt panel */}
      <Show when={enc.open()}>
        <EncryptPanel enc={enc} />
      </Show>

      {/* Actions */}
      <div class="flex flex-wrap items-center gap-3 border-t border-rim pt-4">
        <SecondaryButton
          onClick={() => {
            store.reset();
            attach.clear();
            acl.reset();
            enc.reset();
            props.onCancel?.();
          }}
        >
          {isEditing() ? t("editor.cancel_btn") : t("editor.discard")}
        </SecondaryButton>

        {/* ACL picker */}
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

        <div class="ml-auto">
          <PrimarySubmitButton
            disabled={store.submitting() || attach.uploading() || !store.body().trim() || !store.title().trim()}
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
